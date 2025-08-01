/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { wildcardQuery } from '@kbn/observability-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import {
  AWSIndexName,
  AWS_INDEX_NAME_LIST,
  FIREHOSE_CLOUDFORMATION_TEMPLATE_URL,
} from '../../../common/aws_firehose';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';

export interface CreateFirehoseOnboardingFlowRouteResponse {
  apiKeyEncoded: string;
  onboardingId: string;
  elasticsearchUrl: string;
  templateUrl: string;
}

export type HasFirehoseDataRouteResponse = AWSIndexName[];

interface DocumentCountPerIndexBucket {
  key: string;
  doc_count: number;
}

const createFirehoseOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/firehose/flow',
  security: {
    authz: {
      enabled: false,
      reason: 'This route has custom authorization logic using Elasticsearch client',
    },
  },
  async handler({
    context,
    request,
    plugins,
    services,
    logger,
  }): Promise<CreateFirehoseOnboardingFlowRouteResponse> {
    const {
      elasticsearch: { client },
    } = await context.core;
    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to start a new onboarding flow. Contact your system administrator to grant you the required privileges."
      );
    }

    const fleetPluginStart = await plugins.fleet.start();
    const packageClient = fleetPluginStart.packageService.asScoped(request);

    const [{ encoded: apiKeyEncoded }] = await Promise.all([
      createShipperApiKey(client.asCurrentUser, 'firehose'),
      packageClient.ensureInstalledPackage({ pkgName: 'awsfirehose' }),
    ]);

    /**
     * Triggering the AWS package installation but not
     * waiting for the completion as it might take a while.
     * The AWS integration is not required for data ingestion
     * and can be installed separately in case it fails to install
     * during onboarding.
     */
    packageClient.ensureInstalledPackage({ pkgName: 'aws' }).catch((error) => {
      logger.error(`Failed installing AWS package: ${error}`);
    });

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    return {
      onboardingId: uuidv4(),
      apiKeyEncoded,
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      templateUrl: FIREHOSE_CLOUDFORMATION_TEMPLATE_URL,
    };
  },
});

const hasFirehoseDataRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/firehose/has-data',
  params: t.type({
    query: t.type({
      streamName: t.string,
      stackName: t.string,
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by Elasticsearch client',
    },
  },
  async handler(resources): Promise<HasFirehoseDataRouteResponse> {
    const { streamName, stackName } = resources.params.query;
    const { elasticsearch } = await resources.context.core;
    const indexPatternList = AWS_INDEX_NAME_LIST.map((index) => `${index}-*`);

    try {
      const result = await elasticsearch.client.asCurrentUser.search<
        unknown,
        Record<
          'documents_per_index',
          estypes.AggregationsMultiBucketAggregateBase<DocumentCountPerIndexBucket>
        >
      >({
        index: indexPatternList,
        ignore_unavailable: true,
        size: 0,
        query: {
          bool: {
            should: [
              ...wildcardQuery('aws.kinesis.name', streamName),
              ...wildcardQuery('aws.firehose.arn', streamName),
              ...wildcardQuery('aws.exporter.arn', stackName),
            ],
          },
        },
        aggs: {
          documents_per_index: {
            terms: {
              field: '_index',
              size: indexPatternList.length,
            },
          },
        },
      });

      const buckets = result.aggregations?.documents_per_index.buckets;

      if (!Array.isArray(buckets)) {
        return [];
      }

      return AWS_INDEX_NAME_LIST.filter((indexName) => {
        return buckets.some((bucket) => bucket.key.includes(indexName) && bucket.doc_count > 0);
      });
    } catch (error) {
      throw Boom.internal(`Elasticsearch responded with an error. ${error.message}`);
    }
  },
});

export const firehoseOnboardingRouteRepository = {
  ...createFirehoseOnboardingFlowRoute,
  ...hasFirehoseDataRoute,
};
