/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import {
  apiPublishesId,
  apiPublishesViewMode,
  PublishesId,
  PublishesParent,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React from 'react';
import { apiProvidesLensConfig, ProvidesLensConfig } from '../../embeddable/provides_lens_config';
import type { LensPluginStartDependencies } from '../../plugin';
import './helpers.scss';

interface Context {
  api: unknown;
  startDependencies: LensPluginStartDependencies;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
}

type OpenLensConfigActionAPI = ProvidesLensConfig &
  PublishesId &
  PublishesViewMode &
  Partial<PublishesParent>;

const apiIsCompatible = (api: unknown): api is OpenLensConfigActionAPI =>
  apiProvidesLensConfig(api) && apiPublishesViewMode(api) && apiPublishesId(api);

export async function isActionCompatible(api: unknown) {
  if (!apiIsCompatible(api)) return false;
  return api.getIsLensEditable() && api.viewMode.value === 'edit';
}

export async function executeAction({ api, startDependencies, overlays, theme }: Context) {
  if (!apiIsCompatible(api)) throw new IncompatibleActionError();

  const overlayTracker = tracksOverlays(api.parent?.value) ? api?.parent?.value : undefined;
  const ConfigPanel = await api.openConfigPanel(startDependencies);
  if (ConfigPanel) {
    const handle = overlays.openFlyout(
      toMountPoint(
        React.cloneElement(ConfigPanel, {
          closeFlyout: () => {
            if (overlayTracker) overlayTracker.clearOverlays();
            handle.close();
          },
        }),
        {
          theme$: theme.theme$,
        }
      ),
      {
        className: 'lnsConfigPanel__overlay',
        size: 's',
        'data-test-subj': 'customizeLens',
        type: 'push',
        hideCloseButton: true,
        onClose: (overlayRef) => {
          if (overlayTracker) overlayTracker.clearOverlays();
          overlayRef.close();
        },
        outsideClickCloses: true,
      }
    );
    overlayTracker?.openOverlay(handle, { focusedPanelId: api.id.value });
  }
}
