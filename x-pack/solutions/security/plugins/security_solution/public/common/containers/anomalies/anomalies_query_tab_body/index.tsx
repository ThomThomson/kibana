/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import type { AnomaliesQueryTabBodyProps } from './types';
import { getAnomaliesFilterQuery } from './utils';
import { useInstalledSecurityJobs } from '../../../components/ml/hooks/use_installed_security_jobs';
import { useUiSetting$ } from '../../../lib/kibana';
import { MatrixHistogram } from '../../../components/matrix_histogram';
import { histogramConfigs } from './histogram_configs';

const ID = 'anomaliesHistogramQuery';

const AnomaliesQueryTabBodyComponent: React.FC<AnomaliesQueryTabBodyProps> = ({
  deleteQuery,
  endDate,
  skip,
  startDate,
  type,
  filterQuery,
  anomaliesFilterQuery,
  AnomaliesTableComponent,
  flowTarget,
  ip,
  hostName,
  userName,
}) => {
  const { jobs } = useInstalledSecurityJobs();
  const [anomalyScore] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const mergedFilterQuery = getAnomaliesFilterQuery(
    filterQuery,
    anomaliesFilterQuery,
    jobs,
    anomalyScore,
    flowTarget,
    ip
  );

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <MatrixHistogram
        endDate={endDate}
        filterQuery={mergedFilterQuery}
        id={ID}
        startDate={startDate}
        {...histogramConfigs}
      />
      <AnomaliesTableComponent
        startDate={startDate}
        endDate={endDate}
        skip={skip}
        type={type}
        flowTarget={flowTarget}
        ip={ip}
        hostName={hostName}
        userName={userName}
      />
    </>
  );
};

AnomaliesQueryTabBodyComponent.displayName = 'AnomaliesQueryTabBodyComponent';

export const AnomaliesQueryTabBody = React.memo(AnomaliesQueryTabBodyComponent);

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
