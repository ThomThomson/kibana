/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';
import { getCommonRequestHeader } from '../../../services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const spacesService = getService('spaces');

  const jobIdSpace1 = `sample_logs_${Date.now()}`;
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  const PARTITION_FIELD_NAME = 'event.dataset';
  const testJobConfig = {
    job_id: jobIdSpace1,
    groups: ['sample_logs', 'bootstrap', 'categorization'],
    description: "count by mlcategory (message) on 'sample logs' dataset with 15m bucket span",
    analysis_config: {
      bucket_span: '15m',
      categorization_field_name: 'message',
      per_partition_categorization: { enabled: true, stop_on_warn: true },
      detectors: [
        {
          function: 'count',
          by_field_name: 'mlcategory',
          partition_field_name: PARTITION_FIELD_NAME,
        },
      ],
      influencers: ['mlcategory'],
    },
    analysis_limits: { model_memory_limit: '26MB' },
    data_description: { time_field: '@timestamp', time_format: 'epoch_ms' },
    model_plot_config: { enabled: false, annotations_enabled: true },
    model_snapshot_retention_days: 10,
    daily_model_snapshot_retention_after_days: 1,
    allow_lazy_open: false,
  };
  // @ts-expect-error not full interface
  const testDatafeedConfig: Datafeed = {
    datafeed_id: `datafeed-${jobIdSpace1}`,
    indices: ['ft_module_sample_logs'],
    job_id: jobIdSpace1,
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const expectedCategoryDefinition = {
    categoryId: '1',
    examplesLength: 4,
  };

  async function getCategoryDefinition(
    jobId: string,
    categoryId: string,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/internal/ml/results/category_definition`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send({ jobId, categoryId });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('get category_definition', function () {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/ml/module_sample_logs'
      );
      await ml.testResources.setKibanaTimeZoneToUTC();
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        // @ts-expect-error not full interface
        testJobConfig,
        testDatafeedConfig,
        { space: idSpace1 }
      );
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
    });

    it('should produce the correct category for the job', async () => {
      const resp = await getCategoryDefinition(
        jobIdSpace1,
        expectedCategoryDefinition.categoryId,
        USER.ML_POWERUSER,
        200,
        idSpace1
      );

      expect(resp.categoryId).to.eql(
        expectedCategoryDefinition.categoryId,
        `categoryId should be ${expectedCategoryDefinition.categoryId} (got ${resp.categoryId})`
      );
      expect(resp.examples.length).to.eql(
        expectedCategoryDefinition.examplesLength,
        `examples list length should be ${expectedCategoryDefinition.examplesLength} (got ${resp.examples.length})`
      );
      expect(resp.terms.length).to.be.greaterThan(
        0,
        `terms string length should be greater than 0 (got ${resp.terms.length})`
      );
      expect(resp.regex.length).to.be.greaterThan(
        0,
        `regex string length should be greater than 0 (got ${resp.regex.length})`
      );
    });

    it('should not produce the correct category for the job in the wrong space', async () => {
      await getCategoryDefinition(
        jobIdSpace1,
        expectedCategoryDefinition.categoryId,
        USER.ML_POWERUSER,
        404,
        idSpace2
      );
    });

    it('should produce the correct category for ml viewer user', async () => {
      const resp = await getCategoryDefinition(
        jobIdSpace1,
        expectedCategoryDefinition.categoryId,
        USER.ML_VIEWER,
        200,
        idSpace1
      );

      expect(resp.categoryId).to.eql(
        expectedCategoryDefinition.categoryId,
        `categoryId should be ${expectedCategoryDefinition.categoryId} (got ${resp.categoryId})`
      );
      expect(resp.examples.length).to.eql(
        expectedCategoryDefinition.examplesLength,
        `examples list length should be ${expectedCategoryDefinition.examplesLength} (got ${resp.examples.length})`
      );
      expect(resp.terms.length).to.be.greaterThan(
        0,
        `terms string length should be greater than 0 (got ${resp.terms.length})`
      );
      expect(resp.regex.length).to.be.greaterThan(
        0,
        `regex string length should be greater than 0 (got ${resp.regex.length})`
      );
    });

    it('should not produce the correct category for ml unauthorized user', async () => {
      await getCategoryDefinition(
        jobIdSpace1,
        expectedCategoryDefinition.categoryId,
        USER.ML_UNAUTHORIZED,
        403,
        idSpace1
      );
    });
  });
};
