/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiCanUnlinkFromLibrary, CanUnlinkFromLibrary } from '@kbn/presentation-library';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import {
  apiPublishesViewMode,
  HasUnknownApi,
  PublishesPanelTitle,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { pluginServices } from '../services/plugin_services';
import { dashboardUnlinkFromLibraryActionStrings } from './_dashboard_actions_strings';

export const ACTION_UNLINK_FROM_LIBRARY = 'unlinkFromLibrary';

export type UnlinkPanelFromLibraryActionApi = PublishesViewMode &
  CanUnlinkFromLibrary &
  Partial<PublishesPanelTitle>;

export const unlinkActionIsCompatible = (
  api: unknown | null
): api is UnlinkPanelFromLibraryActionApi =>
  Boolean(apiPublishesViewMode(api) && apiCanUnlinkFromLibrary(api));

export class UnlinkFromLibraryAction implements Action<HasUnknownApi> {
  public readonly type = ACTION_UNLINK_FROM_LIBRARY;
  public readonly id = ACTION_UNLINK_FROM_LIBRARY;
  public order = 15;

  private toastsService;

  constructor() {
    ({
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

  public getDisplayName({ api }: HasUnknownApi) {
    if (!unlinkActionIsCompatible(api)) throw new IncompatibleActionError();
    return dashboardUnlinkFromLibraryActionStrings.getDisplayName();
  }

  public getIconType({ api }: HasUnknownApi) {
    if (!unlinkActionIsCompatible(api)) throw new IncompatibleActionError();
    return 'folderExclamation';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    if (!unlinkActionIsCompatible(api)) return false;
    return api.viewMode.value === 'edit' && (await api.canUnlinkFromLibrary());
  }

  public async execute({ api }: HasUnknownApi) {
    if (!unlinkActionIsCompatible(api)) throw new IncompatibleActionError();
    try {
      await api.unlinkFromLibrary();
      const panelTitle = api.panelTitle?.value ?? api.defaultPanelTitle?.value;
      this.toastsService.addSuccess({
        title: dashboardUnlinkFromLibraryActionStrings.getSuccessMessage(
          panelTitle ? `'${panelTitle}'` : ''
        ),
        'data-test-subj': 'unlinkPanelSuccess',
      });
    } catch (e) {
      this.toastsService.addSuccess({
        title: dashboardUnlinkFromLibraryActionStrings.getFailureMessage(),
        'data-test-subj': 'unlinkPanelFailure',
      });
    }
  }
}
