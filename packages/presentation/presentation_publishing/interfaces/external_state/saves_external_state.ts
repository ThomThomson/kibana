/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * An API that saves its state to some external store.
 */
export interface SavesExternalState {
  /**
   * Save the state to some external store.
   */
  saveExternalState: () => Promise<void>;
}

export const apiSavesExternalState = (api: unknown | null): api is SavesExternalState => {
  return Boolean((api as SavesExternalState)?.saveExternalState);
};
