/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useMemo } from 'react';
import styled from '@emotion/styled';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { DefaultDraggable } from '../draggables';
import { useUiSetting$ } from '../../lib/kibana';
import { EMPTY_VALUE_LABEL } from './translation';
import { hasValueToDisplay } from '../../utils/validators';
import {
  SecurityCellActions,
  SecurityCellActionType,
  SecurityCellActionsTrigger,
  CellActionsMode,
} from '../cell_actions';
import { getSourcererScopeId } from '../../../helpers';

const CountFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin-right: ${theme.euiTheme.size.s};`}
`;

export interface LegendItem {
  color?: string;
  dataProviderId: string;
  render?: (fieldValuePair?: { field: string; value: string | number }) => React.ReactNode;
  field: string;
  scopeId?: string;
  value: string | number;
  count?: number;
}

/**
 * Renders the value or a placeholder in case the value is empty
 */
const ValueWrapper = React.memo<{ value: LegendItem['value'] }>(({ value }) =>
  hasValueToDisplay(value) ? (
    <>{value}</>
  ) : (
    <em data-test-subj="value-wrapper-empty">{EMPTY_VALUE_LABEL}</em>
  )
);

ValueWrapper.displayName = 'ValueWrapper';

const DraggableLegendItemComponent: React.FC<{
  legendItem: LegendItem;
  isInlineActions?: boolean;
}> = ({ legendItem, isInlineActions = false }) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const { color, count, dataProviderId, field, scopeId, value } = legendItem;

  const sourcererScopeId = getSourcererScopeId(scopeId ?? '');
  const content = useMemo(() => {
    return legendItem.render == null ? (
      <ValueWrapper value={value} />
    ) : (
      legendItem.render({ field, value })
    );
  }, [field, value, legendItem]);

  return (
    <EuiText size="xs">
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
        {color != null && (
          <EuiFlexItem grow={false}>
            <EuiHealth data-test-subj="legend-color" color={color} />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={true}>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              {isInlineActions ? (
                content
              ) : (
                <DefaultDraggable
                  field={field}
                  hideTopN={true}
                  id={dataProviderId}
                  scopeId={scopeId}
                  value={value}
                >
                  {content}
                </DefaultDraggable>
              )}
            </EuiFlexItem>

            {count != null && (
              <CountFlexItem data-test-subj="legendItemCount" grow={false}>
                {numeral(count).format(defaultNumberFormat)}
              </CountFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        {isInlineActions && (
          <EuiFlexItem grow={false} data-test-subj="legendItemInlineActions">
            <SecurityCellActions
              mode={CellActionsMode.INLINE}
              visibleCellActions={0}
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              data={{ field, value }}
              sourcererScopeId={sourcererScopeId}
              metadata={{ scopeId }}
              disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
              extraActionsIconType="boxesVertical"
              extraActionsColor="text"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiText>
  );
};

DraggableLegendItemComponent.displayName = 'DraggableLegendItemComponent';

export const DraggableLegendItem = React.memo(DraggableLegendItemComponent);
