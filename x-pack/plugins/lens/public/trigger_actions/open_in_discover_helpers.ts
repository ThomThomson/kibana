/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { apiProvidesLensConfig } from '../embeddable/provides_lens_config';

interface DiscoverAppLocatorParams extends SerializableRecord {
  timeRange?: TimeRange;
  filters?: Filter[];
  indexPatternId?: string;
  query?: Query | AggregateQuery | undefined;
  columns?: string[];
}

export type DiscoverAppLocator = LocatorPublic<DiscoverAppLocatorParams>;

interface Context {
  api: unknown;
  filters?: Filter[];
  openInSameTab?: boolean;
  hasDiscoverAccess: boolean;
  dataViews: Pick<DataViewsService, 'get'>;
  locator?: DiscoverAppLocator;
  timeFieldName?: string;
}

export async function isCompatible({ hasDiscoverAccess, api }: Context) {
  if (!hasDiscoverAccess || !apiProvidesLensConfig(api)) return false;
  try {
    return await api.canViewUnderlyingData();
  } catch (e) {
    // Fetching underlying data failed, log the error and behave as if the action is not compatible
    // eslint-disable-next-line no-console
    console.error(e);
    return false;
  }
}

async function getDiscoverLocationParams({
  api,
  filters,
  dataViews,
  timeFieldName,
}: Pick<Context, 'dataViews' | 'api' | 'filters' | 'timeFieldName'>) {
  if (!apiProvidesLensConfig(api)) throw new IncompatibleActionError();
  const args = api.getViewUnderlyingDataArgs();
  if (!args) {
    // shouldn't be executed because of the isCompatible check
    throw new Error('Underlying data is not ready');
  }
  const dataView = await dataViews.get(args.dataViewSpec.id!);
  let filtersToApply = [...(filters || []), ...args.filters];
  let timeRangeToApply = args.timeRange;
  // if the target data view is time based, attempt to split out a time range from the provided filters
  if (dataView.isTimeBased() && dataView.timeFieldName === timeFieldName) {
    const { extractTimeRange } = await import('@kbn/es-query');
    const { restOfFilters, timeRange } = extractTimeRange(filters || [], timeFieldName);
    filtersToApply = restOfFilters;
    if (timeRange) {
      timeRangeToApply = timeRange;
    }
  }

  return {
    ...args,
    timeRange: timeRangeToApply,
    filters: filtersToApply,
  };
}

export async function getHref({ api, locator, filters, dataViews, timeFieldName }: Context) {
  const params = await getDiscoverLocationParams({
    api,
    filters,
    dataViews,
    timeFieldName,
  });
  const discoverUrl = locator?.getRedirectUrl(params);

  return discoverUrl;
}

export async function getLocation({ api, locator, filters, dataViews, timeFieldName }: Context) {
  const params = await getDiscoverLocationParams({
    api,
    filters,
    dataViews,
    timeFieldName,
  });

  const discoverLocation = locator?.getLocation(params);

  if (!discoverLocation) {
    throw new Error('Discover location not found');
  }

  return discoverLocation;
}

export async function execute({
  api,
  locator,
  filters,
  openInSameTab,
  dataViews,
  timeFieldName,
  hasDiscoverAccess,
}: Context) {
  const discoverUrl = await getHref({
    api,
    locator,
    filters,
    dataViews,
    timeFieldName,
    hasDiscoverAccess,
  });
  window.open(discoverUrl, !openInSameTab ? '_blank' : '_self');
}
