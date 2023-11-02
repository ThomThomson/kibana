/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { DashboardStartDependencies } from './plugin';

export let uiActions: DashboardStartDependencies['uiActions'];

const servicesReady$ = new BehaviorSubject(false);
export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};

/**
 * The Kibana Presentation team is slowly unifying on this pattern for gathering dependencies on other plugins.
 */
export const setKibanaServices = (deps: DashboardStartDependencies) => {
  uiActions = deps.uiActions;
  servicesReady$.next(true);
};
