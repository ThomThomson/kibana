/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { MlCapabilitiesResponse } from '@kbn/ml-plugin/common/types/capabilities';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../services/ml/common_api';
import { USER } from '../../../services/ml/security_common';

const NUMBER_OF_CAPABILITIES = 44;

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  async function runRequest(user: USER): Promise<MlCapabilitiesResponse> {
    const { body, status } = await supertest
      .get(`/internal/ml/ml_capabilities`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(200, status, body);

    return body;
  }

  describe('ml_capabilities', () => {
    describe('get capabilities', function () {
      it('should be enabled in space', async () => {
        const { mlFeatureEnabledInSpace } = await runRequest(USER.ML_POWERUSER);
        expect(mlFeatureEnabledInSpace).to.eql(true);
      });

      it('should have upgradeInProgress false', async () => {
        const { upgradeInProgress } = await runRequest(USER.ML_POWERUSER);
        expect(upgradeInProgress).to.eql(false);
      });

      it('should have full license', async () => {
        const { isPlatinumOrTrialLicense } = await runRequest(USER.ML_POWERUSER);
        expect(isPlatinumOrTrialLicense).to.eql(true);
      });

      it('should have the right number of capabilities', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER);
        expect(Object.keys(capabilities).length).to.eql(NUMBER_OF_CAPABILITIES);
      });

      it('should get viewer capabilities', async () => {
        const { capabilities } = await runRequest(USER.ML_VIEWER);

        expect(capabilities).to.eql({
          canCreateJob: false,
          canDeleteJob: false,
          canOpenJob: false,
          canCloseJob: false,
          canResetJob: false,
          canUpdateJob: false,
          canForecastJob: false,
          canDeleteForecast: false,
          canCreateDatafeed: false,
          canDeleteDatafeed: false,
          canStartStopDatafeed: false,
          canUpdateDatafeed: false,
          canPreviewDatafeed: false,
          canGetFilters: false,
          canCreateCalendar: false,
          canDeleteCalendar: false,
          canCreateFilter: false,
          canDeleteFilter: false,
          canCreateDataFrameAnalytics: false,
          canDeleteDataFrameAnalytics: false,
          canStartStopDataFrameAnalytics: false,
          canCreateMlAlerts: false,
          canUseMlAlerts: true,
          canGetFieldInfo: true,
          canGetMlInfo: true,
          canUseAiops: true,
          canGetJobs: true,
          canGetDatafeeds: true,
          canGetCalendars: true,
          canFindFileStructure: true,
          canGetDataFrameAnalytics: true,
          canGetAnnotations: true,
          canCreateAnnotation: true,
          canDeleteAnnotation: true,
          canViewMlNodes: false,
          canGetTrainedModels: true,
          canTestTrainedModels: true,
          canCreateTrainedModels: false,
          canCreateInferenceEndpoint: false,
          canDeleteTrainedModels: false,
          canStartStopTrainedModels: false,
          isADEnabled: true,
          isDFAEnabled: true,
          isNLPEnabled: true,
        });
      });

      it('should get power user capabilities', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER);

        expect(capabilities).to.eql({
          canCreateJob: true,
          canDeleteJob: true,
          canOpenJob: true,
          canCloseJob: true,
          canResetJob: true,
          canUpdateJob: true,
          canForecastJob: true,
          canDeleteForecast: true,
          canCreateDatafeed: true,
          canDeleteDatafeed: true,
          canStartStopDatafeed: true,
          canUpdateDatafeed: true,
          canPreviewDatafeed: true,
          canGetFilters: true,
          canCreateCalendar: true,
          canDeleteCalendar: true,
          canCreateFilter: true,
          canDeleteFilter: true,
          canCreateDataFrameAnalytics: true,
          canDeleteDataFrameAnalytics: true,
          canStartStopDataFrameAnalytics: true,
          canCreateMlAlerts: true,
          canUseMlAlerts: true,
          canGetFieldInfo: true,
          canGetMlInfo: true,
          canUseAiops: true,
          canGetJobs: true,
          canGetDatafeeds: true,
          canGetCalendars: true,
          canFindFileStructure: true,
          canGetDataFrameAnalytics: true,
          canGetAnnotations: true,
          canCreateAnnotation: true,
          canDeleteAnnotation: true,
          canViewMlNodes: true,
          canGetTrainedModels: true,
          canTestTrainedModels: true,
          canCreateTrainedModels: true,
          canCreateInferenceEndpoint: true,
          canDeleteTrainedModels: true,
          canStartStopTrainedModels: true,
          isADEnabled: true,
          isDFAEnabled: true,
          isNLPEnabled: true,
        });
      });
    });
  });
};
