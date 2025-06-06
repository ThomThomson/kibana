/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { DASHBOARDS_PATH, SecurityPageName } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { DashboardsContainer } from './pages';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

export const DashboardRoutes = () => (
  <PluginTemplateWrapper>
    <DashboardsContainer />
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: DASHBOARDS_PATH,
    component: withSecurityRoutePageWrapper(DashboardRoutes, SecurityPageName.dashboards),
  },
];
