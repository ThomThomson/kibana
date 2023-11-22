/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { HasUnknownApi } from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { LibraryNotificationPopover } from './library_notification_popover';
import { unlinkActionIsCompatible, UnlinkFromLibraryAction } from './unlink_from_library_action';
import { dashboardLibraryNotificationStrings } from './_dashboard_actions_strings';

export const ACTION_LIBRARY_NOTIFICATION = 'ACTION_LIBRARY_NOTIFICATION';

export class LibraryNotificationAction implements Action<HasUnknownApi> {
  public readonly id = ACTION_LIBRARY_NOTIFICATION;
  public readonly type = ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  constructor(private unlinkAction: UnlinkFromLibraryAction) {}

  private displayName = dashboardLibraryNotificationStrings.getDisplayName();

  private icon = 'folderCheck';

  public readonly MenuItem = ({ context }: { context: HasUnknownApi }) => {
    const { api } = context;
    if (!unlinkActionIsCompatible(api)) throw new IncompatibleActionError();
    return (
      <LibraryNotificationPopover
        unlinkAction={this.unlinkAction}
        displayName={this.displayName}
        context={{ api }}
        icon={this.getIconType({ api })}
        id={this.id}
      />
    );
  };

  public couldBecomeCompatible({ api }: HasUnknownApi) {
    return unlinkActionIsCompatible(api);
  }

  public subscribeToCompatibilityChanges(
    { api }: HasUnknownApi,
    onChange: (isCompatible: boolean, action: LibraryNotificationAction) => void
  ) {
    if (!unlinkActionIsCompatible(api)) return;

    /**
     * TODO: Upgrade this action by subscribing to changes in the existance of a saved object id. Currently,
     *  this is unnecessary because a link or unlink operation will cause the panel to unmount and remount.
     */
    return api.viewMode.subscribe((viewMode) => {
      onChange(viewMode === 'edit' && api.canUnlinkFromLibrary(), this);
    });
  }

  public getDisplayName({ api }: HasUnknownApi) {
    if (!unlinkActionIsCompatible(api)) throw new IncompatibleActionError();
    return this.displayName;
  }

  public getIconType({ api }: HasUnknownApi) {
    if (!unlinkActionIsCompatible(api)) throw new IncompatibleActionError();
    return this.icon;
  }

  public isCompatible = async ({ api }: HasUnknownApi) => {
    if (!unlinkActionIsCompatible(api)) return false;
    return api.viewMode.value === 'edit' && api.canUnlinkFromLibrary();
  };

  public execute = async () => {};
}
