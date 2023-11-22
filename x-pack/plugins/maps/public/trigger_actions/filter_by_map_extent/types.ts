/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiHasType,
  HasType,
  HasTypeDisplayName,
  PublishesDisabledActionIds,
  PublishesParent,
  PublishingSubject,
} from '@kbn/presentation-publishing';

export interface PublishesFilterByMapExtentState {
  filterByMapExtent: PublishingSubject<boolean>;
}

export type FilterByMapExtentActionApi = PublishesFilterByMapExtentState &
  HasType &
  Partial<PublishesParent<HasTypeDisplayName> & HasTypeDisplayName & PublishesDisabledActionIds>;
export const apiIsFilterByMapExtentActionApi = (
  api: unknown
): api is FilterByMapExtentActionApi => {
  return Boolean(api && (api as FilterByMapExtentActionApi).filterByMapExtent) && apiHasType(api);
};
