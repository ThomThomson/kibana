/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { GridLayout, GridLayoutData, GridPanelData } from '@kbn/grid-layout';
import classNames from 'classnames';
import React from 'react';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
} from '../../../dashboard_constants';
import { useDashboardContainer } from '../../embeddable/dashboard_container';

export const DashboardGrid = ({ viewportWidth }: { viewportWidth: number }) => {
  const dashboard = useDashboardContainer();
  const panels = dashboard.select((state) => state.explicitInput.panels);
  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);
  const useMargins = dashboard.select((state) => state.explicitInput.useMargins);
  const expandedPanelId = dashboard.select((state) => state.componentState.expandedPanelId);

  const classes = classNames({
    'dshLayout-withoutMargins': !useMargins,
    'dshLayout--viewing': viewMode === ViewMode.VIEW,
    'dshLayout--editing': viewMode !== ViewMode.VIEW,
    'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
  });

  const panelProps = {
    showBadges: true,
    showBorder: useMargins,
    showNotifications: true,
    showShadow: false,
  };

  return (
    <div className={classes}>
      <GridLayout
        getCreationOptions={() => {
          const layoutPanels = Object.values(panels).reduce((acc, panel) => {
            const gridData: GridPanelData = {
              id: panel.explicitInput.id,
              row: panel.gridData.y,
              column: panel.gridData.x,
              width: panel.gridData.w,
              height: panel.gridData.h,
            };
            acc[panel.explicitInput.id] = gridData;
            return acc;
          }, {} as { [key: string]: GridPanelData });
          const initialLayout: GridLayoutData = [
            {
              title: 'DEFAULT DASHBOARD',
              isCollapsed: false,
              panels: layoutPanels,
            },
          ];
          return {
            initialLayout,
            gridSettings: {
              gutterSize: DASHBOARD_MARGIN_SIZE,
              rowHeight: DASHBOARD_GRID_HEIGHT,
              columnCount: DASHBOARD_GRID_COLUMN_COUNT,
            },
          };
        }}
        renderPanelContents={(embeddableId) => {
          const type = panels[embeddableId].type;
          return (
            <ReactEmbeddableRenderer
              type={type}
              maybeId={embeddableId}
              panelProps={panelProps}
              getParentApi={() => dashboard}
              key={`${type}_${embeddableId}`}
              onApiAvailable={(api) => dashboard.registerChildApi(api)}
            />
          );
        }}
      ></GridLayout>
    </div>
  );
};
