/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { MachineLearningProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ml';
import { IngestManagerProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ingest_manager';
import { UsageAPIProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/usage_api';
import { services as commonServices } from '../../common/services';

// @ts-ignore not ts yet
import { EsSupertestWithoutAuthProvider } from './es_supertest_without_auth';
import { SecuritySolutionApiProvider } from './security_solution_api.gen';
import { SecuritySolutionApiProvider as SecuritySolutionExceptionsApiProvider } from './security_solution_exceptions_api.gen';

export const services = {
  ...commonServices,

  esSupertest: kibanaApiIntegrationServices.esSupertest,
  supertest: kibanaApiIntegrationServices.supertest,
  esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
  usageAPI: UsageAPIProvider,
  ml: MachineLearningProvider,
  ingestManager: IngestManagerProvider,
  securitySolutionApi: SecuritySolutionApiProvider,
  securitySolutionExceptionsApi: SecuritySolutionExceptionsApiProvider,
};
