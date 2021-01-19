/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import { DashboardSavedObject } from '../..';
import { dashboardUnsavedListingStrings, getNewDashboardTitle } from '../../dashboard_strings';
import { useKibana } from '../../services/kibana_react';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_panel_storage';
import { DashboardAppServices, DashboardRedirect } from '../types';
import { confirmDiscardUnsavedChanges } from './confirm_overlays';

const DashboardUnsavedItem = ({
  dashboard,
  onOpenClick,
  onDiscardClick,
}: {
  dashboard?: DashboardSavedObject;
  onOpenClick: () => void;
  onDiscardClick: () => void;
}) => {
  return (
    <div className="dshUnsavedListingItem">
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiIcon color="text" className="dshUnsavedListingItem__icon" type="dashboardApp" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4 className="dshUnsavedListingItem__title">
              {dashboard?.title ?? getNewDashboardTitle()}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        gutterSize="none"
        alignItems="flexStart"
        className="dshUnsavedListingItem__actions"
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            size="s"
            color="primary"
            onClick={onOpenClick}
            data-test-subj={`edit-unsaved-${dashboard?.id ?? DASHBOARD_PANELS_UNSAVED_ID}`}
          >
            {dashboardUnsavedListingStrings.getEditTitle()}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={onDiscardClick}
            data-test-subj={`discard-unsaved-${dashboard?.id ?? DASHBOARD_PANELS_UNSAVED_ID}`}
          >
            {dashboardUnsavedListingStrings.getDiscardTitle()}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

export const DashboardUnsavedListing = ({ redirectTo }: { redirectTo: DashboardRedirect }) => {
  const {
    services: {
      dashboardPanelStorage,
      savedDashboards,
      core: { overlays },
    },
  } = useKibana<DashboardAppServices>();

  const [items, setItems] = useState<JSX.Element[]>([]);
  const [dashboardIds, setDashboardIds] = useState<string[]>([]);

  const onOpen = useCallback(
    (id?: string) => {
      redirectTo({ destination: 'dashboard', id, editMode: true });
    },
    [redirectTo]
  );

  const onDiscard = useCallback(
    (id?: string) => {
      confirmDiscardUnsavedChanges(overlays, () => {
        dashboardPanelStorage.clearPanels(id);
        setDashboardIds(dashboardPanelStorage.getDashboardIdsWithUnsavedChanges());
      });
    },
    [overlays, dashboardPanelStorage]
  );

  useMount(() => {
    setDashboardIds(dashboardPanelStorage.getDashboardIdsWithUnsavedChanges());
  });

  useEffect(() => {
    let hasNewDashboard = false;
    const dashPromises = dashboardIds
      .filter((id) => {
        if (id !== DASHBOARD_PANELS_UNSAVED_ID) {
          return true;
        }
        hasNewDashboard = true;
        return false;
      })
      .map((dashboardId) => savedDashboards.get(dashboardId));
    Promise.all(dashPromises).then((dashboards: DashboardSavedObject[]) => {
      const newItems = dashboards.map((dashboard) => (
        <DashboardUnsavedItem
          key={dashboard.id}
          dashboard={dashboard}
          onOpenClick={() => onOpen(dashboard.id)}
          onDiscardClick={() => onDiscard(dashboard.id)}
        />
      ));
      if (hasNewDashboard) {
        newItems.unshift(
          <DashboardUnsavedItem
            key={DASHBOARD_PANELS_UNSAVED_ID}
            onOpenClick={() => onOpen()}
            onDiscardClick={() => onDiscard()}
          />
        );
      }
      setItems(newItems);
    });
  }, [dashboardIds, onOpen, onDiscard, savedDashboards]);

  return items.length === 0 ? null : (
    <>
      <EuiCallOut
        heading="h3"
        title={dashboardUnsavedListingStrings.getUnsavedChangesTitle(items.length > 1)}
      >
        {items}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
