/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiCanExpandPanels,
  CanExpandPanels,
  getExpandedPanelId,
} from '@kbn/presentation-containers';
import {
  apiPublishesId,
  apiPublishesParent,
  apiPublishesViewMode,
  HasUnknownApi,
  PublishesId,
  PublishesParent,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { dashboardExpandPanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_EXPAND_PANEL = 'togglePanel';

type ExpandPanelActionApi = PublishesViewMode & PublishesId & PublishesParent<CanExpandPanels>;

const isApiCompatible = (api: unknown | null): api is ExpandPanelActionApi =>
  Boolean(
    apiPublishesId(api) &&
      apiPublishesViewMode(api) &&
      apiPublishesParent(api) &&
      apiCanExpandPanels(api.parent.value)
  );

export class ExpandPanelAction implements Action<HasUnknownApi> {
  public readonly type = ACTION_EXPAND_PANEL;
  public readonly id = ACTION_EXPAND_PANEL;
  public order = 7;

  constructor() {}

  public getDisplayName({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return getExpandedPanelId(api.parent.value)
      ? dashboardExpandPanelActionStrings.getMinimizeTitle()
      : dashboardExpandPanelActionStrings.getMaximizeTitle();
  }

  public getIconType({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return getExpandedPanelId(api.parent.value) ? 'minimize' : 'expand';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    return isApiCompatible(api);
  }

  public async execute({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    api.parent.value.expandPanel(getExpandedPanelId(api.parent.value) ? undefined : api.id.value);
  }
}
