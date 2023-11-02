/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardPanelState } from '../../../common';
import { DashboardContainer } from '../embeddable/dashboard_container';

// TODO lock down DashboardAPI
export type DashboardAPI = DashboardContainer;
export type AwaitingDashboardAPI = DashboardAPI | null;

export const buildApiFromDashboardContainer = (container?: DashboardContainer) => container ?? null;

/**
 * An interface that holds types for the methods that Dashboard publishes which should not be used
 * outside of the Dashboard plugin. These are necessary temporarily for some actions.
 */
export interface DashboardPluginInternalFunctions {
  /**
   * A temporary backdoor to allow some actions access to the Dashboard panels. This should eventually be replaced with a generic version
   * on the PresentationContainer interface.
   */
  getDashboardPanelFromId: (id: string) => DashboardPanelState;
}
