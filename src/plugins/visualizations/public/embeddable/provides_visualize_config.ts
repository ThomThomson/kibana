/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisParams } from '../types';
import Vis from '../vis';

export interface ProvidesVisualizeConfig {
  getVis: () => Vis<VisParams>;
  getExpressionVariables?: () => Record<string, unknown> | undefined;
}

export const apiProvidesVisualizeConfig = (api: unknown): api is ProvidesVisualizeConfig => {
  return Boolean(api && (api as ProvidesVisualizeConfig).getVis);
};
