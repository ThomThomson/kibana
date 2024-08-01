/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon, EuiPanel, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useCallback, useRef } from 'react';
import { GridData, PanelInteractionEvent } from './types';

export const KibanaGridElement = ({
  gridData,
  activePanelId,
  setInteractionEvent,
}: {
  gridData: GridData;
  activePanelId: string | undefined;
  setInteractionEvent: (
    interactionData?: Omit<PanelInteractionEvent, 'targetRowIndex' | 'originRowIndex'>
  ) => void;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const thisPanelActive = activePanelId === gridData.id;

  const interactionStart = useCallback(
    (type: 'drag' | 'resize', e: React.DragEvent) => {
      if (!panelRef.current || !ghostRef.current) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.dropEffect = 'move';
      e.dataTransfer.setDragImage(ghostRef.current, 0, 0);
      const panelRect = panelRef.current.getBoundingClientRect();
      setInteractionEvent({
        type,
        id: gridData.id,
        panelDiv: panelRef.current,
        mouseOffsets: {
          top: e.clientY - panelRect.top,
          left: e.clientX - panelRect.left,
          right: e.clientX - panelRect.right,
          bottom: e.clientY - panelRect.bottom,
        },
      });
    },
    [gridData.id, setInteractionEvent]
  );

  return (
    <div
      ref={panelRef}
      css={css`
        grid-column-start: ${gridData.column + 1};
        grid-column-end: ${gridData.column + 1 + gridData.width};
        grid-row-start: ${gridData.row + 1};
        grid-row-end: ${gridData.row + 1 + gridData.height};
      `}
    >
      <EuiPanel
        hasShadow={false}
        hasBorder={true}
        css={css`
          position: relative;
          height: 100%;
          border: ${thisPanelActive
            ? `${euiThemeVars.euiBorderWidthThin} dashed ${euiThemeVars.euiColorSuccess}`
            : 'auto'};
          :hover .resizeHandle {
            opacity: ${Boolean(activePanelId) ? 0 : 1};
          }
          :hover .dragHandle {
            opacity: ${Boolean(activePanelId) ? 0 : 1};
          }
        `}
      >
        {/* Dragging ghost */}
        <div
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            opacity: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          `}
          ref={ghostRef}
        />
        {/* drag handle */}
        <div
          draggable="true"
          className="dragHandle"
          css={css`
            opacity: 0;
            top: -${euiThemeVars.euiSizeL};
            position: absolute;
            z-index: 1000;
            border: 1px solid ${euiThemeVars.euiBorderColor};
            background-color: ${euiThemeVars.euiColorEmptyShade};
            border-radius: ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius} 0 0;
            width: ${euiThemeVars.euiSizeL};
            height: ${euiThemeVars.euiSizeL};
            cursor: move;
            display: flex;
            justify-content: center;
            align-items: center;
          `}
          onDragStart={(e: React.DragEvent<HTMLDivElement>) => interactionStart('drag', e)}
        >
          <EuiIcon type="grabOmnidirectional" />
        </div>
        {/* Resize handle */}
        <div
          draggable="true"
          className="resizeHandle"
          onDragStart={(e) => interactionStart('resize', e)}
          css={css`
            right: 0;
            bottom: 0;
            opacity: 0;
            position: absolute;
            width: ${euiThemeVars.euiSizeL};
            height: ${euiThemeVars.euiSizeL};
            border-radius: 7px 0 7px 0;
            border-bottom: 2px solid ${euiThemeVars.euiColorSuccess};
            border-right: 2px solid ${euiThemeVars.euiColorSuccess};
            transition: opacity 0.2s, border 0.2s;
            margin: -2px;
            :hover {
              background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.05)};
              cursor: se-resize;
            }
          `}
        />
        {/* Contents */}
        <strong>id:</strong> {gridData.id}
      </EuiPanel>
    </div>
  );
};
