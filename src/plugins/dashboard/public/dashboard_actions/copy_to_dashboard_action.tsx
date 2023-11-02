/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  apiHasType,
  apiPublishesId,
  apiPublishesParent,
  HasType,
  PublishesId,
  PublishesParent,
  PublishesSavedObjectId,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { AnyApiActionContext } from '.';
import { DASHBOARD_CONTAINER_TYPE } from '../dashboard_container';
import { DashboardPluginInternalFunctions } from '../dashboard_container/external_api/dashboard_api';
import { pluginServices } from '../services/plugin_services';
import { CopyToDashboardModal } from './copy_to_dashboard_modal';
import { dashboardCopyToDashboardActionStrings } from './_dashboard_actions_strings';

export const ACTION_COPY_TO_DASHBOARD = 'copyToDashboard';

export interface DashboardCopyToCapabilities {
  canCreateNew: boolean;
  canEditExisting: boolean;
}

export type CopyToDashboardAPI = HasType &
  PublishesId &
  PublishesParent<
    { type: typeof DASHBOARD_CONTAINER_TYPE } & PublishesSavedObjectId &
      DashboardPluginInternalFunctions
  >;

const apiIsCompatible = (api: unknown): api is CopyToDashboardAPI => {
  return (
    apiPublishesId(api) &&
    apiPublishesParent(api) &&
    apiHasType(api.parent.value) &&
    api.parent.value.type === DASHBOARD_CONTAINER_TYPE
  );
};

export class CopyToDashboardAction implements Action<AnyApiActionContext> {
  public readonly type = ACTION_COPY_TO_DASHBOARD;
  public readonly id = ACTION_COPY_TO_DASHBOARD;
  public order = 1;

  private dashboardCapabilities;
  private openModal;

  constructor(private core: CoreStart) {
    ({
      dashboardCapabilities: this.dashboardCapabilities,
      overlays: { openModal: this.openModal },
    } = pluginServices.getServices());
  }

  public getDisplayName({ api }: AnyApiActionContext) {
    if (!apiIsCompatible(api)) throw new IncompatibleActionError();

    return dashboardCopyToDashboardActionStrings.getDisplayName();
  }

  public getIconType({ api }: AnyApiActionContext) {
    if (!apiIsCompatible(api)) throw new IncompatibleActionError();
    return 'exit';
  }

  public async isCompatible({ api }: AnyApiActionContext) {
    if (!apiIsCompatible(api)) return false;
    const { createNew: canCreateNew, showWriteControls: canEditExisting } =
      this.dashboardCapabilities;
    return Boolean(canCreateNew || canEditExisting);
  }

  public async execute({ api }: AnyApiActionContext) {
    if (!apiIsCompatible(api)) throw new IncompatibleActionError();

    const { theme, i18n } = this.core;
    const session = this.openModal(
      toMountPoint(<CopyToDashboardModal closeModal={() => session.close()} api={api} />, {
        theme,
        i18n,
      }),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );
  }
}
