/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { MlFeatures } from '../../common/constants/app';

export function registerSampleDataSetLinks(
  home: HomeServerPluginSetup,
  enabledFeatures: MlFeatures,
  logger: Logger
) {
  if (enabledFeatures.ad === true) {
    const sampleDataLinkLabel = i18n.translate('xpack.ml.sampleDataLinkLabel', {
      defaultMessage: 'ML jobs',
    });
    const { addAppLinksToSampleDataset } = home.sampleData;
    const getCreateJobPath = (jobId: string, dataViewId: string) =>
      `/app/management/ml/anomaly_detection/modules/check_view_or_create?id=${jobId}&index=${dataViewId}`;

    try {
      addAppLinksToSampleDataset('ecommerce', [
        {
          sampleObject: {
            type: 'index-pattern',
            id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
          },
          getPath: (objectId) => getCreateJobPath('sample_data_ecommerce', objectId),
          label: sampleDataLinkLabel,
          icon: 'machineLearningApp',
        },
      ]);
    } catch (error) {
      logger.warn(`ML failed to register sample data links for sample_data_ecommerce`);
    }

    try {
      addAppLinksToSampleDataset('logs', [
        {
          sampleObject: {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b247',
          },
          getPath: (objectId) => getCreateJobPath('sample_data_weblogs', objectId),
          label: sampleDataLinkLabel,
          icon: 'machineLearningApp',
        },
      ]);
    } catch (error) {
      logger.warn(`ML failed to register sample data links for sample_data_weblogs`);
    }
  }
}
