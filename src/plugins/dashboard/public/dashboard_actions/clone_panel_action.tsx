/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { apiCanDuplicatePanels, CanDuplicatePanels } from '@kbn/presentation-containers';
import {
  apiPublishesId,
  apiPublishesParent,
  apiPublishesViewMode,
  HasUnknownApi,
  PublishesFatalError,
  PublishesId,
  PublishesParent,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { dashboardClonePanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_CLONE_PANEL = 'clonePanel';

type ClonePanelActionApi = PublishesViewMode &
  PublishesId &
  PublishesParent<CanDuplicatePanels> &
  Partial<PublishesFatalError>;

const isApiCompatible = (api: unknown | null): api is ClonePanelActionApi =>
  Boolean(
    apiPublishesId(api) &&
      apiPublishesViewMode(api) &&
      apiPublishesParent(api) &&
      apiCanDuplicatePanels(api.parent.value)
  );

export class ClonePanelAction implements Action<HasUnknownApi> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;

  constructor() {}

  public getDisplayName({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return dashboardClonePanelActionStrings.getDisplayName();
  }

  public getIconType({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return 'copy';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) return false;
    return Boolean(!api.fatalError?.value && api.viewMode.value === 'edit');
  }

  public async execute({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    api.parent.value.duplicatePanel(api.id.value);
  }
}
