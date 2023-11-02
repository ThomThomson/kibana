/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useReactiveVarFromSubject } from '../publishing_utils';

export interface PublishesFatalError {
  fatalError: PublishingSubject<Error | undefined>;
}

export const apiPublishesFatalError = (
  unknownApi: null | unknown
): unknownApi is PublishesFatalError => {
  return Boolean(unknownApi && (unknownApi as PublishesFatalError)?.fatalError !== undefined);
};

/**
 * Gets this API's fatal error as a reactive variable which will cause re-renders on change.
 */
export const useFatalError = (api: Partial<PublishesFatalError> | undefined) =>
  useReactiveVarFromSubject<Error | undefined, PublishesFatalError['fatalError']>(api?.fatalError);

/**
 * Gets this API's fatal error as a one-time imperative action.
 */
export const getFatalError = (api: Partial<PublishesFatalError> | undefined) =>
  api?.fatalError?.getValue();
