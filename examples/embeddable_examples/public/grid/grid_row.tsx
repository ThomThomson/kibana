/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHorizontalRule, EuiTitle, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { forwardRef } from 'react';
import { useMemo } from 'react';
import { KibanaGridElement } from './grid_layout_element';
import { getGridBackgroundCSS } from './grid_layout_utils';
import { GridRow, PanelInteractionEvent, RuntimeGridSettings } from './types';

interface KibanaGridRowProps {
  rowIndex: number;
  gridRow: GridRow;
  activePanelId: string | undefined;
  targetedGridIndex: number | undefined;
  runtimeSettings: RuntimeGridSettings;
  setInteractionEvent: (interactionData?: PanelInteractionEvent) => void;
}

export const KibanaGridRow = forwardRef<HTMLDivElement, KibanaGridRowProps>(
  (
    { rowIndex, gridRow, setInteractionEvent, activePanelId, runtimeSettings, targetedGridIndex },
    gridRef
  ) => {
    const { gutterSize, columnCount, rowHeight } = runtimeSettings;
    const isGridTargeted = activePanelId && targetedGridIndex === rowIndex;

    // calculate row count based on the number of rows needed to fit all panels
    const rowCount = useMemo(() => {
      const maxRow = Object.values(gridRow).reduce((acc, panel) => {
        return Math.max(acc, panel.row + panel.height);
      }, 0);
      return maxRow || 1;
    }, [gridRow]);

    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiTitle>
          <h2>Section</h2>
        </EuiTitle>
        <EuiHorizontalRule margin="m" />
        <div
          ref={gridRef}
          css={css`
            height: 100%;
            width: 100%;
            display: grid;
            gap: ${gutterSize}px;
            grid-template-columns: repeat(
              ${columnCount},
              calc((100% - ${gutterSize * (columnCount - 1)}px) / ${columnCount})
            );
            grid-template-rows: repeat(${rowCount}, ${rowHeight}px);
            justify-items: stretch;
            background-color: ${isGridTargeted
              ? transparentize(euiThemeVars.euiColorSuccess, 0.05)
              : 'transparent'};
            transition: background-color 300ms linear;
            ${isGridTargeted && getGridBackgroundCSS(runtimeSettings)}
          `}
        >
          {Object.values(gridRow).map((gridData) => (
            <KibanaGridElement
              activePanelId={activePanelId}
              onResizeStart={(id, shift) => {
                setInteractionEvent({
                  mouseToOriginOffset: shift,
                  originRowIndex: rowIndex,
                  type: 'resize',
                  id,
                });
              }}
              onDragStart={(id, shift) => {
                setInteractionEvent({
                  mouseToOriginOffset: shift,
                  originRowIndex: rowIndex,
                  type: 'drag',
                  id,
                });
              }}
              gridData={gridData}
              key={gridData.id}
            />
          ))}
        </div>
      </>
    );
  }
);
