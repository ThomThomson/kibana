/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiIsPresentationContainer,
  PresentationContainer,
  TracksOverlays,
} from '@kbn/presentation-containers';
import {
  apiPublishesId,
  apiPublishesParent,
  apiPublishesViewMode,
  HasUnknownApi,
  PublishesId,
  PublishesPanelTitle,
  PublishesParent,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openReplacePanelFlyout } from './open_replace_panel_flyout';
import { dashboardReplacePanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_REPLACE_PANEL = 'replacePanel';

export type ReplacePanelActionApi = PublishesViewMode &
  PublishesId &
  Partial<PublishesPanelTitle> &
  PublishesParent<PresentationContainer & Partial<TracksOverlays>>;

const isApiCompatible = (api: unknown | null): api is ReplacePanelActionApi =>
  Boolean(
    apiPublishesId(api) &&
      apiPublishesViewMode(api) &&
      apiPublishesParent(api) &&
      apiIsPresentationContainer(api.parent.value)
  );

export class ReplacePanelAction implements Action<HasUnknownApi> {
  public readonly type = ACTION_REPLACE_PANEL;
  public readonly id = ACTION_REPLACE_PANEL;
  public order = 3;

  constructor(private savedobjectfinder: React.ComponentType<any>) {}

  public getDisplayName({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return dashboardReplacePanelActionStrings.getDisplayName();
  }

  public getIconType({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return 'kqlOperand';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) return false;
    return api.viewMode.value === 'edit';
  }

  public async execute({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();

    openReplacePanelFlyout({
      api,
      savedObjectFinder: this.savedobjectfinder,
    });
  }
}
