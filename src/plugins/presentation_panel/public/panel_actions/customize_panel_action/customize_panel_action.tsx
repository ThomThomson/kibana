/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React from 'react';

import { tracksOverlays } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  apiPublishesLocalUnifiedSearch,
  apiPublishesViewMode,
  HasUnknownApi,
  PublishesDataViews,
  PublishesParent,
  PublishesViewMode,
  PublishesWritableLocalUnifiedSearch,
  PublishesWritablePanelDescription,
  PublishesWritablePanelTitle,
} from '@kbn/presentation-publishing';
import { core } from '../../kibana_services';
import { ACTION_CUSTOMIZE_PANEL } from '../action_ids';
import { CustomizePanelEditor } from './customize_panel_editor';

export type CustomizePanelActionApi = PublishesViewMode &
  PublishesDataViews &
  Partial<
    PublishesWritableLocalUnifiedSearch &
      PublishesWritablePanelDescription &
      PublishesWritablePanelTitle &
      PublishesParent
  >;

const isApiCompatible = (api: unknown | null): api is CustomizePanelActionApi =>
  Boolean(apiPublishesViewMode(api) && apiPublishesDataViews(api));
export class CustomizePanelAction implements Action<HasUnknownApi> {
  public type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 40;

  constructor() {}

  public getDisplayName({ api }: HasUnknownApi): string {
    return i18n.translate('presentation.action.customizePanel.displayName', {
      defaultMessage: 'Panel settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) return false;
    // It should be possible to customize just the time range in View mode
    return api.viewMode.value === 'edit' || apiPublishesLocalUnifiedSearch(api);
  }

  public async execute({ api }: HasUnknownApi) {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();

    // send the overlay ref to the parent if it is capable of tracking overlays
    const parent = api.parent?.value;
    const overlayTracker = tracksOverlays(parent) ? parent : undefined;

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: core.uiSettings,
    });

    const handle = core.overlays.openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <CustomizePanelEditor
            api={api}
            onClose={() => {
              if (overlayTracker) overlayTracker.clearOverlays();
              handle.close();
            }}
          />
        </KibanaReactContextProvider>,
        { theme: core.theme, i18n: core.i18n }
      ),
      {
        size: 's',
        'data-test-subj': 'customizePanel',
        onClose: (overlayRef) => {
          if (overlayTracker) overlayTracker.clearOverlays();
          overlayRef.close();
        },
        maxWidth: true,
      }
    );
    overlayTracker?.openOverlay(handle);
  }
}
