/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';

import type { TooltipHeaderFormatter } from '@elastic/charts';
import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';

import { MetricDistributionChartTooltipHeader } from './metric_distribution_chart_tooltip_header';
import { kibanaFieldFormat } from '../../../utils';
import { useDataVizChartTheme } from '../../hooks';
import { useColumnChartStyles } from '../field_data_row/column_chart_styles';

export interface MetricDistributionChartData {
  x: number;
  y: number;
  dataMin: number;
  dataMax: number;
  percent: number;
}

interface Props {
  width: number;
  height: number;
  chartData: MetricDistributionChartData[];
  fieldFormat?: any; // Kibana formatter for field being viewed
  hideXAxis?: boolean;
}

const SPEC_ID = 'metric_distribution';

export const MetricDistributionChart: FC<Props> = ({
  width,
  height,
  chartData,
  fieldFormat,
  hideXAxis,
}) => {
  // This value is shown to label the y axis values in the tooltip.
  // Ideally we wouldn't show these values at all in the tooltip,
  // but this is not yet possible with Elastic charts.
  const seriesName = i18n.translate(
    'xpack.dataVisualizer.dataGrid.field.metricDistributionChart.seriesName',
    {
      defaultMessage: 'distribution',
    }
  );

  const theme = useDataVizChartTheme({ disableGridLines: true });

  const styles = useColumnChartStyles();

  const chartBaseTheme = useElasticChartsTheme();

  const headerFormatter: TooltipHeaderFormatter = (tooltipData) => {
    const xValue = tooltipData.value;
    const chartPoint: MetricDistributionChartData | undefined = chartData.find(
      (data) => data.x === xValue
    );

    return (
      <MetricDistributionChartTooltipHeader
        chartPoint={chartPoint}
        maxWidth={width}
        fieldFormat={fieldFormat}
      />
    );
  };

  return (
    <div data-test-subj="dataVisualizerFieldDataMetricDistributionChart" css={styles.histogram}>
      <Chart size={{ width, height }}>
        <Tooltip headerFormatter={headerFormatter} />
        <Settings baseTheme={chartBaseTheme} theme={theme} locale={i18n.getLocale()} />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={(d) => kibanaFieldFormat(d, fieldFormat)}
          hide={hideXAxis === true}
        />
        <Axis id="left" position={Position.Left} tickFormat={(d) => d.toFixed(3)} hide={true} />
        <AreaSeries
          id={SPEC_ID}
          name={seriesName}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={
            chartData.length > 0 ? chartData : [{ x: 0, y: 0, dataMin: 0, dataMax: 0, percent: 0 }]
          }
          curve={CurveType.CURVE_STEP_AFTER}
        />
      </Chart>
    </div>
  );
};
