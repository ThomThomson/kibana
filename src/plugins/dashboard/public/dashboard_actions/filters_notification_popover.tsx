/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
} from '@elastic/eui';

import { getEditPanelAction } from '@kbn/presentation-panel-plugin/public';
import { FiltersNotificationActionContext } from './filters_notification_action';
import { FiltersNotificationPopoverContents } from './filters_notification_popover_contents';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
  displayName: string;
  icon: string;
  id: string;
}

export function FiltersNotificationPopover({
  displayName,
  context,
  icon,
  id,
}: FiltersNotificationProps) {
  const { embeddable } = context;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [disableEditbutton, setDisableEditButton] = useState(false);

  const editPanelAction = getEditPanelAction();

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="text"
          iconType={icon}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          data-test-subj={`embeddablePanelNotification-${id}`}
          aria-label={displayName}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>{displayName}</EuiPopoverTitle>
      <FiltersNotificationPopoverContents
        context={context}
        setDisableEditButton={setDisableEditButton}
      />
      <EuiPopoverFooter>
        {!disableEditbutton && (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            justifyContent="flexEnd"
            responsive={false}
            wrap={true}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj={'filtersNotificationModal__editButton'}
                size="s"
                fill
                onClick={() => editPanelAction.execute({ api: embeddable })}
              >
                {dashboardFilterNotificationActionStrings.getEditButtonTitle()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
