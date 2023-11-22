/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useReactiveVarFromSubject } from '../publishing_utils';

export interface PublishesId {
  id: PublishingSubject<string>;
}

export const apiPublishesId = (unknownApi: null | unknown): unknownApi is PublishesId => {
  return Boolean(unknownApi && (unknownApi as PublishesId)?.id !== undefined);
};

/**
 * Gets this API's ID as a reactive variable which will cause re-renders on change.
 */
export const useId = <ApiType extends Partial<PublishesId> = Partial<PublishesId>>(api: ApiType) =>
  useReactiveVarFromSubject<string, ApiType['id']>(apiPublishesId(api) ? api.id : undefined);
