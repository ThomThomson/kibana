/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchClient } from '@kbn/metrics-data-access-plugin/server';
import {
  TIMESTAMP_FIELD,
  PROCESS_COMMANDLINE_FIELD,
  MANDATORY_PROCESS_FIELDS,
  TOP_N,
} from '../../../common/constants';
import type {
  ProcessListAPIRequest,
  ProcessListAPIQueryAggregation,
} from '../../../common/http_api';
import type { InfraSourceConfiguration } from '../sources';

const mandatoryFieldsFilter = MANDATORY_PROCESS_FIELDS.map((field) => ({
  exists: {
    field,
  },
}));

export const getProcessList = async (
  search: ESSearchClient,
  sourceConfiguration: InfraSourceConfiguration,
  { hostTerm, to, sortBy, searchFilter }: ProcessListAPIRequest
) => {
  const filter = searchFilter ? searchFilter : [{ match_all: {} }];
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: to - 60 * 1000, // 1 minute
                lte: to,
                format: 'epoch_millis',
              },
            },
          },
          {
            term: hostTerm,
          },
        ],
      },
    },
    aggs: {
      summaryEvent: {
        filter: {
          term: {
            'event.dataset': 'system.process.summary',
          },
        },
        aggs: {
          summary: {
            top_hits: {
              size: 1,
              sort: [
                {
                  [TIMESTAMP_FIELD]: {
                    order: 'desc',
                  },
                },
              ],
              _source: ['system.process.summary'],
            },
          },
        },
      },
      processes: {
        filter: {
          bool: {
            must: [...filter, ...mandatoryFieldsFilter],
          },
        },
        aggs: {
          filteredProcs: {
            terms: {
              field: PROCESS_COMMANDLINE_FIELD,
              size: TOP_N,
              order: {
                [sortBy.name]: sortBy.isAscending ? 'asc' : 'desc',
              },
            },
            aggs: {
              cpu: {
                avg: {
                  field: 'system.process.cpu.total.pct',
                },
              },
              memory: {
                avg: {
                  field: 'system.process.memory.rss.pct',
                },
              },
              startTime: {
                max: {
                  field: 'system.process.cpu.start_time',
                },
              },
              meta: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      [TIMESTAMP_FIELD]: {
                        order: 'desc',
                      },
                    },
                  ],
                  _source: [
                    'system.process.state',
                    'user.name',
                    'process.pid',
                    'process.command_line',
                  ],
                },
              },
            },
          },
        },
      },
    },
  };
  try {
    const result = await search<{}, ProcessListAPIQueryAggregation>({
      body,
      index: sourceConfiguration.metricAlias,
    });
    const { buckets: processListBuckets } = result.aggregations!.processes.filteredProcs;
    const processList = processListBuckets.map((bucket) => {
      const meta = bucket.meta.hits.hits[0]._source;

      return {
        cpu: bucket.cpu.value,
        memory: bucket.memory.value,
        startTime: Date.parse(bucket.startTime.value_as_string),
        pid: meta.process.pid,
        state: meta.system.process.state,
        user: meta.user.name,
        command: bucket.key,
      };
    });

    const summary: { [p: string]: number } = result.aggregations!.summaryEvent.summary.hits.hits
      .length
      ? result.aggregations!.summaryEvent.summary.hits.hits[0]._source.system.process.summary
      : {};

    return {
      processList,
      summary,
    };
  } catch (e) {
    throw e;
  }
};
