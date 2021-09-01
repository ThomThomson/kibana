/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiDroppable,
  EuiDraggable,
  euiDragDropReorder,
  DropResult,
  EuiIcon,
  EuiButtonGroup,
  EuiPanel,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiAccordion,
  EuiSwitch,
  EuiTextColor,
  EuiContextMenu,
  EuiPopover,
} from '@elastic/eui';
import { ControlGroupStrings } from '../control_group_strings';

type ControlWidth = 'auto' | 'small' | 'medium' | 'large';
export type ControlStyle = 'twoLine' | 'oneLine';

const widthOptions = [
  {
    id: `auto`,
    label: ControlGroupStrings.management.controlWidth.getAutoWidthTitle(),
  },
  {
    id: `small`,
    label: ControlGroupStrings.management.controlWidth.getSmallWidthTitle(),
  },
  {
    id: `medium`,
    label: ControlGroupStrings.management.controlWidth.getMediumWidthTitle(),
  },
  {
    id: `large`,
    label: ControlGroupStrings.management.controlWidth.getLargeWidthTitle(),
  },
];

export interface InputControlMeta {
  embeddableId: string;
  width: ControlWidth;
  title: string;
}

interface ManageControlGroupProps {
  controlMeta: InputControlMeta[];
  setControlMeta: React.Dispatch<React.SetStateAction<InputControlMeta[]>>;
  controlStyle: ControlStyle;
  setControlStyle: React.Dispatch<React.SetStateAction<ControlStyle>>;
}

export const ManageControlGroupComponent = ({
  controlMeta,
  setControlMeta,
  controlStyle,
  setControlStyle,
}: ManageControlGroupProps) => {
  const [isManagementFlyoutVisible, setIsManagementFlyoutVisible] = useState(false);
  const [isManagementMenuVisible, setIsManagementMenuVisible] = useState(false);
  const [isSwitchChecked, setIsSwitchChecked] = useState(false);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      setControlMeta(euiDragDropReorder(controlMeta, source.index, destination.index));
    }
  };

  const onSwitchChange = () => {
    setIsSwitchChecked(!isSwitchChecked);
  };

  const closePopover = () => {
    setIsManagementMenuVisible(false);
  };

  const panels = [
    {
      id: 0,
      title: 'Options',
      items: [
        {
          name: 'Layout',
          panel: 1,
        },
        {
          name: 'Reorder',
          panel: 2,
        },
        {
          name: <EuiTextColor color="danger">Delete all</EuiTextColor>,
          icon: <EuiIcon type="trash" size="m" color="danger" />,
        },
        {
          isSeparator: true,
          key: 'sep',
        },
        {
          name: 'Add control',
          icon: 'plusInCircle',
        },
      ],
    },
    {
      id: 1,
      initialFocusedItemIndex: 1,
      title: 'Options',
      items: [
        {
          name: 'Single line',
          icon: controlStyle === 'oneLine' ? 'check' : 'empty',
          onClick: () => {
            setControlStyle('oneLine');
          },
        },
        {
          name: 'Two line',
          icon: controlStyle === 'twoLine' ? 'check' : 'empty',
          onClick: () => {
            setControlStyle('twoLine');
          },
        },
      ],
    },
    {
      id: 2,
      title: 'Options',
      content: (
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA" spacing="none">
            {controlMeta.map((currentControlMeta, index) => (
              <EuiDraggable
                spacing="s"
                index={index}
                customDragHandle={true}
                key={currentControlMeta.embeddableId}
                draggableId={currentControlMeta.embeddableId}
              >
                {(provided, state) => (
                  <EuiPanel
                    paddingSize="s"
                    hasShadow={false}
                    className={`controlGroup--sortItem  ${
                      state.isDragging && 'controlGroup--sortItem-isDragging'
                    }`}
                  >
                    <ManageInputControlLineItem
                      index={index}
                      currentControlMeta={currentControlMeta}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  </EuiPanel>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
      ),
    },
  ];

  const manageControlsIcon = (
    <EuiButtonEmpty
      size="xs"
      flush="left"
      iconType="gear"
      color="text"
      data-test-subj="inputControlsSortingButton"
      onClick={() => setIsManagementMenuVisible(!isManagementMenuVisible)}
    >
      Settings
    </EuiButtonEmpty>
  );

  const manageControlsButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="sortable"
      color="text"
      data-test-subj="inputControlsSortingButton"
      onClick={() => setIsManagementFlyoutVisible(!isManagementFlyoutVisible)}
    >
      {ControlGroupStrings.management.getManageButtonTitle()}
    </EuiButtonEmpty>
  );

  const ManageInputControlLineItem = ({
    currentControlMeta,
    dragHandleProps,
    index,
  }: {
    currentControlMeta: InputControlMeta;
    dragHandleProps: any;
    index: number;
  }) => {
    const { title } = currentControlMeta;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <div {...dragHandleProps} aria-label={`drag-handle${title}`}>
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>{title}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const EditControlLineItem = ({
    currentControlMeta,
    // dragHandleProps,
    index,
  }: {
    currentControlMeta: InputControlMeta;
    // dragHandleProps: any;
    index: number;
  }) => {
    const { title, width } = currentControlMeta;
    return (
      <>
        {/* <EuiFlexGroup alignItems="center" gutterSize="m"> */}
        {/* <div {...dragHandleProps} aria-label={`drag-handle${title}`}>
            <EuiIcon type="grab" />
          </div> */}
        <EuiSpacer size="s" />
        {!isSwitchChecked ? (
          <EuiFormRow label="Width" display="columnCompressed" hasChildLabel={false}>
            <EuiButtonGroup
              buttonSize="compressed"
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={widthOptions}
              idSelected={width}
              onChange={(newWidth: string) =>
                setControlMeta((currentControls) => {
                  currentControls[index].width = newWidth as ControlWidth;
                  return [...currentControls];
                })
              }
            />
          </EuiFormRow>
        ) : null}
        <EuiButtonEmpty
          flush="left"
          size="xs"
          iconType="trash"
          color="danger"
          aria-label={`delete-${title}`}
        >
          {ControlGroupStrings.management.getDeleteButtonTitle()}
        </EuiButtonEmpty>
      </>
    );
  };

  const manageControlGroupFlyout = (
    <EuiFlyout
      type="push"
      size="s"
      ownFocus
      onClose={() => setIsManagementFlyoutVisible(false)}
      aria-labelledby="flyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h2 id="flyoutTitle">{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow label="Layout" display="columnCompressed" hasChildLabel={false}>
          <EuiButtonGroup
            buttonSize="compressed"
            legend={ControlGroupStrings.management.controlStyle.getDesignSwitchLegend()}
            options={[
              {
                id: `oneLine`,
                label: ControlGroupStrings.management.controlStyle.getSingleLineTitle(),
              },
              {
                id: `twoLine`,
                label: ControlGroupStrings.management.controlStyle.getTwoLineTitle(),
              },
            ]}
            idSelected={controlStyle}
            onChange={(newControlStyle) => setControlStyle(newControlStyle as ControlStyle)}
          />
        </EuiFormRow>
        <EuiFormRow label="Width" display="columnCompressedSwitch" hasChildLabel={false}>
          <>
            <EuiSwitch
              label={ControlGroupStrings.management.controlWidth.getChangeAllControlWidthsTitle()}
              name="switch"
              checked={isSwitchChecked}
              onChange={onSwitchChange}
              compressed
            />
            {isSwitchChecked ? (
              <>
                <EuiSpacer size="s" />
                <EuiButtonGroup
                  buttonSize="compressed"
                  idSelected={
                    controlMeta.every((currentMeta) => currentMeta?.width === controlMeta[0]?.width)
                      ? controlMeta[0]?.width
                      : ''
                  }
                  legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
                  options={widthOptions}
                  onChange={(newWidth: string) =>
                    setControlMeta((currentControls) => {
                      currentControls.forEach((currentMeta) => {
                        currentMeta.width = newWidth as ControlWidth;
                      });
                      return [...currentControls];
                    })
                  }
                />
              </>
            ) : null}
          </>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA" spacing="none">
            {controlMeta.map((currentControlMeta, index) => (
              <EuiDraggable
                spacing="none"
                index={index}
                className="controlGroup--sortItemDraggable"
                customDragHandle={true}
                key={currentControlMeta.embeddableId}
                draggableId={currentControlMeta.embeddableId}
              >
                {(provided, state) => (
                  <EuiPanel paddingSize="s">
                    <EuiAccordion
                      id="accordion1"
                      arrowDisplay="right"
                      buttonContent={
                        <div
                          className={`controlGroup--sortItem  ${
                            state.isDragging && 'controlGroup--sortItem-isDragging'
                          }`}
                        >
                          <ManageInputControlLineItem
                            index={index}
                            currentControlMeta={currentControlMeta}
                            dragHandleProps={provided.dragHandleProps}
                          />
                        </div>
                      }
                    >
                      <EditControlLineItem index={index} currentControlMeta={currentControlMeta} />
                    </EuiAccordion>
                  </EuiPanel>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
        <EuiSpacer size="m" />
        <EuiButtonEmpty
          flush="left"
          iconType="trash"
          color="danger"
          aria-label={'delete-all'}
          size="s"
        >
          {ControlGroupStrings.management.getDeleteAllButtonTitle()}
        </EuiButtonEmpty>
      </EuiFlyoutBody>
    </EuiFlyout>
  );

  const manageControlGroupMenu = (
    <EuiPopover
      id="smallContextMenuExample"
      button={manageControlsIcon}
      isOpen={isManagementMenuVisible}
      closePopover={closePopover}
      panelPaddingSize="none"
      panelClassName="controlGroup--sortPopover"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );

  return (
    <>
      {manageControlsButton}
      {isManagementFlyoutVisible && manageControlGroupFlyout}
      {manageControlGroupMenu}
    </>
  );
};
