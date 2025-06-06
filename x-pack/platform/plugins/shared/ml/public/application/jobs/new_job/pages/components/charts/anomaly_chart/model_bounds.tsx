/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { AreaSeriesStyle, RecursivePartial } from '@elastic/charts';
import { ScaleType, AreaSeries, CurveType } from '@elastic/charts';
import type { ModelItem } from '../../../../common/results_loader';
import { areaSeriesStyle, useChartColors } from '../common/settings';

interface Props {
  modelData?: ModelItem[];
}

const SPEC_ID = 'model';

const style: RecursivePartial<AreaSeriesStyle> = {
  ...areaSeriesStyle,
  area: {
    ...areaSeriesStyle.area,
    visible: true,
  },
  line: {
    ...areaSeriesStyle.line,
    strokeWidth: 1,
    opacity: 0.4,
  },
};

export const ModelBounds: FC<Props> = ({ modelData }) => {
  const { MODEL_COLOR } = useChartColors();
  const model = modelData === undefined ? [] : modelData;
  return (
    <AreaSeries
      id={SPEC_ID}
      // Defaults to multi layer time axis as of Elastic Charts v70
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={'time'}
      yAccessors={['modelUpper']}
      y0Accessors={['modelLower']}
      data={model}
      curve={CurveType.CURVE_MONOTONE_X}
      areaSeriesStyle={style}
      color={MODEL_COLOR}
    />
  );
};
