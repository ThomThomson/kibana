/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JOB_STATE } from '@kbn/ml-plugin/common/constants/states';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';
import { getCommonRequestHeader } from '../../../services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'fq_single_space1';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(jobId: string, expectedStatusCode: number, space?: string) {
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/internal/ml/anomaly_detectors/${jobId}/_open`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST anomaly_detectors _open with spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);
    });

    afterEach(async () => {
      await ml.api.closeAnomalyDetectionJob(jobIdSpace1);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects([idSpace1, idSpace2]);
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
    });

    it('should open job from same space', async () => {
      const body = await runRequest(jobIdSpace1, 200, idSpace1);
      expect(body).to.have.property('opened').eql(true, 'Job opening should be acknowledged');
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.OPENED);
    });

    it('should fail to open job from different space', async () => {
      await runRequest(jobIdSpace1, 404, idSpace2);
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.CLOSED);
    });
  });
};
