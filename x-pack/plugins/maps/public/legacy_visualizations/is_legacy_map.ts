/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiProvidesVisualizeConfig } from '@kbn/visualizations-plugin/public';

export function isLegacyMap(api: unknown) {
  return (
    apiProvidesVisualizeConfig(api) && ['region_map', 'tile_map'].includes(api.getVis()?.type?.name)
  );
}
