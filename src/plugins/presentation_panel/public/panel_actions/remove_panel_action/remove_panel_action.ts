/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  apiPublishesId,
  apiPublishesViewMode,
  HasUnknownApi,
  PublishesId,
  PublishesParent,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { getContainerParentFromAPI, PresentationContainer } from '@kbn/presentation-containers';
import { ACTION_REMOVE_PANEL } from '../action_ids';

type RemovePanelActionApi = PublishesViewMode &
  PublishesId &
  PublishesParent<PresentationContainer>;

const isApiCompatible = (api: unknown | null): api is RemovePanelActionApi =>
  Boolean(apiPublishesId(api) && apiPublishesViewMode(api) && getContainerParentFromAPI(api));

export class RemovePanelAction implements Action<HasUnknownApi> {
  public readonly type = ACTION_REMOVE_PANEL;
  public readonly id = ACTION_REMOVE_PANEL;
  public order = 1;

  constructor() {}

  public getDisplayName() {
    return i18n.translate('presentation.action.removePanel.displayName', {
      defaultMessage: 'Delete from dashboard',
    });
  }

  public getIconType() {
    return 'trash';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) return false;

    // any parent can disallow panel removal by implementing canRemovePanels. If this method
    // is not implemented, panel removal is always allowed.
    const parentAllowsPanelRemoval = api.parent.value.canRemovePanels?.() ?? true;
    return Boolean(api.viewMode.value === 'edit' && parentAllowsPanelRemoval);
  }

  public async execute({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    api.parent?.value.removePanel(api.id.value);
  }
}
