/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useReactiveVarFromSubject } from '../publishing_utils';

export interface PublishesParent<ParentApiType extends unknown = unknown> {
  parent: PublishingSubject<ParentApiType>;
}

type UnwrapParent<ApiType extends unknown> = ApiType extends PublishesParent<infer ParentType>
  ? ParentType
  : unknown;

/**
 * A type guard which checks whether or not a given API publishes its parent API.
 */
export const apiPublishesParent = (unknownApi: null | unknown): unknownApi is PublishesParent => {
  return Boolean(unknownApi && (unknownApi as PublishesParent)?.parent !== undefined);
};

export const useParent = <ApiType extends Partial<PublishesParent> = Partial<PublishesParent>>(
  api: ApiType
): UnwrapParent<ApiType> =>
  useReactiveVarFromSubject<unknown, ApiType['parent']>(
    apiPublishesParent(api) ? api.parent : undefined
  ) as UnwrapParent<ApiType>;
