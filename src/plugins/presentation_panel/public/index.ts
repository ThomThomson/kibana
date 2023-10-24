/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationPanelPlugin } from './plugin';

export function plugin() {
  return new PresentationPanelPlugin();
}

export { PresentationPanel, PresentationPanelLoadingIndicator } from './panel_component';
export {
  ACTION_REMOVE_PANEL,
  ACTION_INSPECT_PANEL,
  ACTION_CUSTOMIZE_PANEL,
  ACTION_EDIT_PANEL,
} from './panel_actions';
export type { PresentationPanelProps } from './panel_component/types';
