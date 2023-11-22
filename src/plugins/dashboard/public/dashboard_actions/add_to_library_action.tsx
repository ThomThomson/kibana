/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiCanLinkToLibrary, CanLinkToLibrary } from '@kbn/presentation-library';
import {
  apiPublishesViewMode,
  HasUnknownApi,
  PublishesPanelTitle,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { pluginServices } from '../services/plugin_services';
import { dashboardAddToLibraryActionStrings } from './_dashboard_actions_strings';

export const ACTION_ADD_TO_LIBRARY = 'saveToLibrary';

type AddPanelToLibraryActionApi = PublishesViewMode &
  CanLinkToLibrary &
  Partial<PublishesPanelTitle>;

const isApiCompatible = (api: unknown | null): api is AddPanelToLibraryActionApi =>
  Boolean(apiPublishesViewMode(api) && apiCanLinkToLibrary(api));

export class AddToLibraryAction implements Action<HasUnknownApi> {
  public readonly type = ACTION_ADD_TO_LIBRARY;
  public readonly id = ACTION_ADD_TO_LIBRARY;
  public order = 15;

  private toastsService;

  constructor() {
    ({
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

  public getDisplayName({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return dashboardAddToLibraryActionStrings.getDisplayName();
  }

  public getIconType({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return 'folderCheck';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) return false;
    return api.viewMode.value === 'edit' && (await api.canLinkToLibrary());
  }

  public async execute({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    try {
      await api.linkToLibrary();
      const panelTitle = api.panelTitle?.value ?? api.defaultPanelTitle?.value;
      this.toastsService.addSuccess({
        title: dashboardAddToLibraryActionStrings.getSuccessMessage(
          panelTitle ? `'${panelTitle}'` : ''
        ),
        'data-test-subj': 'addPanelToLibrarySuccess',
      });
    } catch (e) {
      this.toastsService.addDanger({
        title: dashboardAddToLibraryActionStrings.getErrorMessage(),
        'data-test-subj': 'addPanelToLibraryError',
      });
    }
  }
}
