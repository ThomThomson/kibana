/* eslint-disable @kbn/eslint/require-license-header */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import {
  API_VERSIONS,
  APP_ID,
  ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
} from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import type {
  GetEntitySourceResponse,
  UpdateEntitySourceResponse,
} from '../../../../../../common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import {
  CreateEntitySourceRequestBody,
  UpdateEntitySourceRequestBody,
  type CreateEntitySourceResponse,
  GetEntitySourceRequestParams,
  UpdateEntitySourceRequestParams,
} from '../../../../../../common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import { assertAdvancedSettingsEnabled } from '../../../utils/assert_advanced_setting_enabled';

export const monitoringEntitySourceRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_analytics/monitoring/entity_source',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: CreateEntitySourceRequestBody,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreateEntitySourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          await assertAdvancedSettingsEnabled(
            await context.core,
            ENABLE_PRIVILEGED_USER_MONITORING_SETTING
          );

          const secSol = await context.securitySolution;
          const client = secSol.getMonitoringEntitySourceDataClient();
          const body = await client.init(request.body);

          const privMonDataClient = await secSol.getPrivilegeMonitoringDataClient();
          await privMonDataClient.scheduleNow();

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error creating monitoring entity source sync config: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/monitoring/entity_source/{id}',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: GetEntitySourceRequestParams,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetEntitySourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const client = secSol.getMonitoringEntitySourceDataClient();
          const body = await client.get(request.params.id);
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting monitoring entity source sync config: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  router.versioned
    .put({
      access: 'public',
      path: '/api/entity_analytics/monitoring/entity_source/{id}',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: UpdateEntitySourceRequestBody,
            params: UpdateEntitySourceRequestParams,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<UpdateEntitySourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const client = secSol.getMonitoringEntitySourceDataClient();
          const body = await client.update({ ...request.body, id: request.params.id });

          const privMonDataClient = await secSol.getPrivilegeMonitoringDataClient();
          await privMonDataClient.scheduleNow();

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error creating monitoring entity source sync config: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
