/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { DashboardTopNav, LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common';
import { SecurityPageName } from '../../../common';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useCapabilities, useKibana, useNavigateTo } from '../../common/lib/kibana';
import { APP_NAME } from '../../../common/constants';

const DashboardToolBarComponent = ({
  dashboardContainer,
  onLoad,
}: {
  dashboardContainer: DashboardAPI;
  onLoad?: (mode: ViewMode) => void;
}) => {
  const { setHeaderActionMenu } = useKibana().services;

  const viewMode =
    dashboardContainer?.select((state) => state.explicitInput.viewMode) ?? ViewMode.VIEW;

  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const dashboardListingUrl = useMemo(
    () =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
      })}`,
    [getSecuritySolutionUrl]
  );
  const getEditOrCreateDashboardUrl = useCallback(
    (id: string | undefined) =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: id ? `${id}/edit` : `/create`,
      })}`,
    [getSecuritySolutionUrl]
  );

  const redirectTo = useCallback(
    (props) => {
      if (props.destination === 'listing') {
        navigateTo({ url: dashboardListingUrl });
      }
      if (props.destination === 'dashboard') {
        navigateTo({ url: getEditOrCreateDashboardUrl(props.id) });
      }
    },
    [dashboardListingUrl, getEditOrCreateDashboardUrl, navigateTo]
  );

  const landingBreadcrumb: ChromeBreadcrumb[] = useMemo(
    () => [
      {
        text: APP_NAME,
        href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.landing }),
      },
    ],
    [getSecuritySolutionUrl]
  );

  useEffect(() => {
    onLoad?.(viewMode);
  }, [onLoad, viewMode]);

  const embedSettings = useMemo(
    () => ({
      forceHideFilterBar: true,
      forceShowTopNavMenu: true,
      forceShowQueryInput: false,
      forceShowDatePicker: false,
    }),
    []
  );
  const { showWriteControls } = useCapabilities<DashboardCapabilities>(LEGACY_DASHBOARD_APP_ID);

  return showWriteControls ? (
    <DashboardTopNav
      customLeadingBreadCrumbs={landingBreadcrumb}
      dashboardContainer={dashboardContainer}
      forceHideDatePicker={true}
      forceHideQueryInput={true}
      embedSettings={embedSettings}
      redirectTo={redirectTo}
      showBorderBottom={false}
      setCustomHeaderActionMenu={setHeaderActionMenu}
      showResetChange={false}
    />
  ) : null;
};

export const DashboardToolBar = React.memo(DashboardToolBarComponent);
