/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as xpackFunctionalPageObjects } from '@kbn/test-suites-xpack/functional/page_objects';
import { FindingsPageProvider } from './findings_page';
import { CspDashboardPageProvider } from './csp_dashboard_page';
import { AddCisIntegrationFormPageProvider } from './add_cis_integration_form_page';
import { VulnerabilityDashboardPageProvider } from './vulnerability_dashboard_page_object';
import { BenchmarkPagePageProvider } from './benchmark_page';
import { CspSecurityCommonProvider } from './security_common';
import { RulePagePageProvider } from './rule_page';
import { AlertsPageObject } from './alerts_page';
import { NetworkEventsPageObject } from './network_events_page';
import { ExpandedFlyoutGraph } from './expanded_flyout_graph';
import { TimelinePageObject } from './timeline_page';

export const cloudSecurityPosturePageObjects = {
  alerts: AlertsPageObject,
  networkEvents: NetworkEventsPageObject,
  expandedFlyoutGraph: ExpandedFlyoutGraph,
  timeline: TimelinePageObject,
  findings: FindingsPageProvider,
  cloudPostureDashboard: CspDashboardPageProvider,
  cisAddIntegration: AddCisIntegrationFormPageProvider,
  vulnerabilityDashboard: VulnerabilityDashboardPageProvider,
  rule: RulePagePageProvider,
  benchmark: BenchmarkPagePageProvider,
  cspSecurity: CspSecurityCommonProvider,
};
export const pageObjects = {
  ...xpackFunctionalPageObjects,
  ...cloudSecurityPosturePageObjects,
};
