/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uiActions } from '../kibana_services';
import type { EditPanelAction } from './edit_panel_action/edit_panel_action';

export const ACTION_EDIT_PANEL = 'editPanel';
export const ACTION_REMOVE_PANEL = 'deletePanel';
export const ACTION_INSPECT_PANEL = 'openInspector';
export const ACTION_CUSTOMIZE_PANEL = 'customizePanel';

export const getEditPanelAction = () =>
  uiActions.getAction(ACTION_EDIT_PANEL) as unknown as EditPanelAction;
