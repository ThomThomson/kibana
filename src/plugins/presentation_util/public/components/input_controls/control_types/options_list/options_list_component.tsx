/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import classNames from 'classnames';

import { EuiFilterButton, EuiFilterGroup, EuiPopover, EuiSelectableOption } from '@elastic/eui';
import { Subject } from 'rxjs';
import useMount from 'react-use/lib/useMount';
import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopover } from './options_list_popover_component';

import './options_list.scss';

export interface OptionsListComponentState {
  availableOptions?: EuiSelectableOption[];
  selectedOptionsString?: string;
  selectedOptionsCount?: number;
  twoLineLayout?: boolean;
  searchString?: string;
  loading: boolean;
}

export const OptionsListComponent = ({
  componentStateSubject,
  typeaheadSubject,
  updateOption,
}: {
  componentStateSubject: Subject<OptionsListComponentState>;
  typeaheadSubject: Subject<string>;
  updateOption: (index: number) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [optionsListState, setOptionsListState] = useState<OptionsListComponentState>(
    {} as OptionsListComponentState
  );

  useMount(() => {
    componentStateSubject.subscribe((newState) => setOptionsListState(newState));
  });

  const {
    selectedOptionsString,
    selectedOptionsCount,
    availableOptions,
    twoLineLayout,
    searchString,
    loading,
  } = optionsListState;

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      className={classNames('optionsList--filterBtn', {
        'optionsList--filterBtnSingle': !twoLineLayout,
        'optionsList--filterBtnPlaceholder': !selectedOptionsCount,
      })}
      onClick={() => setIsPopoverOpen((openState) => !openState)}
      isSelected={isPopoverOpen}
      numFilters={availableOptions?.length ?? 0}
      hasActiveFilters={(selectedOptionsCount ?? 0) > 0}
      numActiveFilters={selectedOptionsCount}
    >
      {!selectedOptionsCount ? OptionsListStrings.summary.getPlaceholder() : selectedOptionsString}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup
      className={classNames('optionsList--filterGroup', {
        'optionsList--filterGroupSingle': !twoLineLayout,
      })}
    >
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        className="optionsList--popoverOverride"
        anchorClassName="optionsList--anchorOverride"
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="upLeft"
        ownFocus
        repositionOnScroll
      >
        <OptionsListPopover
          loading={loading}
          updateItem={updateOption}
          searchString={searchString}
          typeaheadSubject={typeaheadSubject}
          availableOptions={availableOptions}
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
