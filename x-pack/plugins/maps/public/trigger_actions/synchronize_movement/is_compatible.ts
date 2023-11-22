/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiProvidesLensConfig } from '@kbn/lens-plugin/public';
import { apiIsOfType } from '@kbn/presentation-publishing';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { mapEmbeddablesSingleton } from '../../embeddable/map_embeddables_singleton';
import { isLegacyMap } from '../../legacy_visualizations/is_legacy_map';

export function isCompatible(api: unknown) {
  if (!mapEmbeddablesSingleton.hasMultipleMaps()) {
    return false;
  }

  return (
    (apiProvidesLensConfig(api) && api.getSavedVis()?.visualizationType === 'lnsChoropleth') ||
    isLegacyMap(api) ||
    apiIsOfType(api, MAP_SAVED_OBJECT_TYPE)
  );
}
