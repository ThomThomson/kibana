/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../services/ml/common_api';
import { USER } from '../../../services/ml/security_common';
import { testSetupJobConfigs, jobIds, testSetupAnnotations } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('get_annotations', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      // generate one annotation for each job
      for (let i = 0; i < testSetupJobConfigs.length; i++) {
        const job = testSetupJobConfigs[i];
        const annotationToIndex = testSetupAnnotations[i];
        // @ts-expect-error not full interface
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.indexAnnotation(annotationToIndex);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should fetch all annotations for jobId', async () => {
      const requestBody = {
        jobIds: [jobIds[0]],
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body, status } = await supertest
        .post('/internal/ml/annotations')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.success).to.eql(true);
      expect(body.annotations).not.to.be(undefined);
      [jobIds[0]].forEach((jobId, idx) => {
        expect(body.annotations).to.have.property(jobId);
        expect(body.annotations[jobId]).to.have.length(1);

        const indexedAnnotation = omit(body.annotations[jobId][0], '_id');
        expect(indexedAnnotation).to.eql(testSetupAnnotations[idx]);
      });
    });

    it('should fetch all annotations for multiple jobs', async () => {
      const requestBody = {
        jobIds,
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body, status } = await supertest
        .post('/internal/ml/annotations')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.success).to.eql(true);
      expect(body.annotations).not.to.be(undefined);
      jobIds.forEach((jobId, idx) => {
        expect(body.annotations).to.have.property(jobId);
        expect(body.annotations[jobId]).to.have.length(1);

        const indexedAnnotation = omit(body.annotations[jobId][0], '_id');
        expect(indexedAnnotation).to.eql(testSetupAnnotations[idx]);
      });
    });

    it('should fetch all annotations for user with ML read permissions', async () => {
      const requestBody = {
        jobIds: testSetupJobConfigs.map((j) => j.job_id),
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body, status } = await supertest
        .post('/internal/ml/annotations')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.success).to.eql(true);
      expect(body.annotations).not.to.be(undefined);
      jobIds.forEach((jobId, idx) => {
        expect(body.annotations).to.have.property(jobId);
        expect(body.annotations[jobId]).to.have.length(1);

        const indexedAnnotation = omit(body.annotations[jobId][0], '_id');
        expect(indexedAnnotation).to.eql(testSetupAnnotations[idx]);
      });
    });

    it('should not allow to fetch annotation for unauthorized user', async () => {
      const requestBody = {
        jobIds: testSetupJobConfigs.map((j) => j.job_id),
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body, status } = await supertest
        .post('/internal/ml/annotations')
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
    });
  });
};
