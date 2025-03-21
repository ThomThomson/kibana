/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest as ESSearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ESSearchResponse } from '@kbn/es-types';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { getDataTierFilterCombined } from '@kbn/apm-data-access-plugin/server/utils';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';

export type APMEventESSearchRequestParams = ESSearchRequest & {
  size: number;
  track_total_hits: boolean | number;
};

export async function alertingEsClient<TParams extends APMEventESSearchRequestParams>({
  scopedClusterClient,
  uiSettingsClient,
  params,
}: {
  scopedClusterClient: RuleExecutorServices<never, never, never>['scopedClusterClient'];
  uiSettingsClient: IUiSettingsClient;
  params: TParams;
}): Promise<ESSearchResponse<unknown, TParams>> {
  const excludedDataTiers = await uiSettingsClient.get<DataTier[]>(searchExcludedDataTiers);

  const response = await scopedClusterClient.asCurrentUser.search({
    ...params,
    query: getDataTierFilterCombined({
      filter: params.query,
      excludedDataTiers,
    }),
    ignore_unavailable: true,
  });

  return response as unknown as ESSearchResponse<unknown, TParams>;
}
