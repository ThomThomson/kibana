/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type {
  CanAccessViewMode,
  EmbeddableApiContext,
  HasType,
} from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasType,
  apiIsOfType,
  getInheritedViewMode,
} from '@kbn/presentation-publishing';

import type { PublishesSavedSearch } from '../types';
import { apiPublishesSavedSearch } from '../types';

type ViewSavedSearchActionApi = CanAccessViewMode & HasType & PublishesSavedSearch;

export const compatibilityCheck = (
  api: EmbeddableApiContext['embeddable']
): api is ViewSavedSearchActionApi => {
  return (
    apiCanAccessViewMode(api) &&
    getInheritedViewMode(api) === 'view' &&
    apiHasType(api) &&
    apiIsOfType(api, SEARCH_EMBEDDABLE_TYPE) &&
    apiPublishesSavedSearch(api)
  );
};
