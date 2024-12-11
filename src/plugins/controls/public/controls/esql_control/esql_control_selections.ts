/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import deepEqual from 'react-fast-compare';
import { BehaviorSubject } from 'rxjs';
import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import type { ESQLControlState } from './types';

export function initializeESQLControlSelections(initialState: ESQLControlState) {
  const availableOptions$ = new BehaviorSubject<string[]>(initialState.availableOptions ?? []);
  const selectedOptions$ = new BehaviorSubject<string[]>(initialState.selectedOptions ?? []);
  const variableName$ = new BehaviorSubject<string>(initialState.variableName ?? '');
  const variableType$ = new BehaviorSubject<string>(initialState.variableType ?? '');
  const esqlQuery$ = new BehaviorSubject<string>(initialState.esqlQuery ?? '');
  const title$ = new BehaviorSubject<string | undefined>(initialState.title);

  const selectedOptionsComparatorFunction = (a: string[], b: string[]) =>
    deepEqual(a ?? [], b ?? []);

  function setSelectedOptions(next: string[]) {
    if (!selectedOptionsComparatorFunction(selectedOptions$.value, next)) {
      selectedOptions$.next(next);
    }
  }

  return {
    comparators: {
      selectedOptions: [selectedOptions$, setSelectedOptions, selectedOptionsComparatorFunction],
      availableOptions: [availableOptions$, (next) => availableOptions$.next(next)],
      variableName: [variableName$, (next) => variableName$.next(next)],
      variableType: [variableType$, (next) => variableType$.next(next)],
      esqlQuery: [esqlQuery$, (next) => esqlQuery$.next(next)],
      title: [title$, (next) => title$.next(next)],
    } as StateComparators<
      Pick<
        ESQLControlState,
        | 'selectedOptions'
        | 'availableOptions'
        | 'variableName'
        | 'variableType'
        | 'esqlQuery'
        | 'title'
      >
    >,
    hasInitialSelections: initialState.selectedOptions?.length,
    selectedOptions$: selectedOptions$ as PublishingSubject<string[]>,
    availableOptions$: availableOptions$ as PublishingSubject<string[]>,
    variableName$: variableName$ as PublishingSubject<string>,
    variableType$: variableType$ as PublishingSubject<string>,
    esqlQuery$: esqlQuery$ as PublishingSubject<string>,
    title$: title$ as PublishingSubject<string | undefined>,
    setSelectedOptions,
  };
}
