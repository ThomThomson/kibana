/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import {
  PublishesDataLoading,
  PublishesDataViews,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { PublishesSelectedFields } from '../field_list/publishes_selected_fields';

export interface DataTableQueryState {
  dataView?: DataView;
  timeRange?: TimeRange;
  filters?: Filter[];
  query?: Query | AggregateQuery;
}

export type DataTableSerializedState = SerializedTitles & SerializedTimeRange;

export type DataTableApi = DefaultEmbeddableApi<DataTableSerializedState> & PublishesDataLoading;

export type DataTableProvider = PublishesDataViews & PublishesSelectedFields;
