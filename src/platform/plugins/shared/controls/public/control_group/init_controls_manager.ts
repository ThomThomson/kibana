/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { v4 as generateId } from 'uuid';

import type { Reference } from '@kbn/content-management-utils';
import type {
  HasSerializedChildState,
  PanelPackage,
  PresentationContainer,
} from '@kbn/presentation-containers';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { ControlWidth, ControlsGroupState } from '@kbn/controls-schemas';
import { DEFAULT_CONTROL_WIDTH, DEFAULT_CONTROL_GROW } from '@kbn/controls-constants';
import { BehaviorSubject, first, merge } from 'rxjs';
import type {
  ControlPanelState,
  ControlPanelsState,
  DefaultControlState,
  DefaultDataControlState,
} from '../../common';
import type { DefaultControlApi } from '../controls/types';
import type { ControlGroupApi } from './types';

export type ControlsInOrder = Array<{ id: string; type: string }>;

export function getControlsInOrder(initialControlPanelsState: ControlPanelsState) {
  return Object.keys(initialControlPanelsState)
    .map((key) => ({
      id: key,
      order: initialControlPanelsState[key].order,
      type: initialControlPanelsState[key].type,
    }))
    .sort((a, b) => (a.order > b.order ? 1 : -1))
    .map(({ id, type }) => ({ id, type })); // filter out `order`
}

export function initControlsManager(
  /**
   * Composed from last saved controls state and previous sessions's unsaved changes to controls state
   */
  initialControlsState: ControlPanelsState
) {
  const initialControlIds = Object.keys(initialControlsState);
  const children$ = new BehaviorSubject<{ [key: string]: DefaultControlApi }>({});
  let currentControlsState: { [panelId: string]: DefaultControlState } = {
    ...initialControlsState,
  };
  const controlsInOrder$ = new BehaviorSubject<ControlsInOrder>(
    getControlsInOrder(initialControlsState)
  );
  const lastUsedDataViewId$ = new BehaviorSubject<string | undefined>(
    getLastUsedDataViewId(controlsInOrder$.value, initialControlsState)
  );
  const lastUsedWidth$ = new BehaviorSubject<ControlWidth>(DEFAULT_CONTROL_WIDTH);
  const lastUsedGrow$ = new BehaviorSubject<boolean>(DEFAULT_CONTROL_GROW);

  function untilControlLoaded(
    id: string
  ): DefaultControlApi | Promise<DefaultControlApi | undefined> {
    if (children$.value[id]) {
      return children$.value[id];
    }

    return new Promise((resolve) => {
      const subscription = merge(children$, controlsInOrder$).subscribe(() => {
        if (children$.value[id]) {
          subscription.unsubscribe();
          resolve(children$.value[id]);
          return;
        }

        // control removed before the control finished loading.
        const controlState = controlsInOrder$.value.find((element) => element.id === id);
        if (!controlState) {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });
  }

  function getControlApi(controlUuid: string) {
    return children$.value[controlUuid];
  }

  async function addNewPanel(
    { panelType, serializedState }: PanelPackage<DefaultControlState>,
    index: number
  ) {
    if ((serializedState?.rawState as DefaultDataControlState)?.dataViewId) {
      lastUsedDataViewId$.next((serializedState!.rawState as DefaultDataControlState).dataViewId);
    }
    if (serializedState?.rawState?.width) {
      lastUsedWidth$.next(serializedState.rawState.width);
    }
    if (typeof serializedState?.rawState?.grow === 'boolean') {
      lastUsedGrow$.next(serializedState.rawState.grow);
    }

    const id = generateId();
    const nextControlsInOrder = [...controlsInOrder$.value];
    nextControlsInOrder.splice(index, 0, {
      id,
      type: panelType,
    });
    controlsInOrder$.next(nextControlsInOrder);
    currentControlsState[id] = serializedState?.rawState ?? {};
    return await untilControlLoaded(id);
  }

  function removePanel(panelId: string) {
    delete currentControlsState[panelId];
    controlsInOrder$.next(controlsInOrder$.value.filter(({ id }) => id !== panelId));
    children$.next(omit(children$.value, panelId));
  }

  return {
    controlsInOrder$,
    getNewControlState: () => {
      return {
        grow: lastUsedGrow$.value,
        width: lastUsedWidth$.value,
        dataViewId: lastUsedDataViewId$.value,
      };
    },
    getControlApi,
    setControlApi: (uuid: string, controlApi: DefaultControlApi) => {
      children$.next({
        ...children$.getValue(),
        [uuid]: controlApi,
      });
    },
    serializeControls: () => {
      const references: Reference[] = [];

      const controls: ControlsGroupState['controls'] = [];

      controlsInOrder$.getValue().forEach(({ id }, index) => {
        const controlApi = getControlApi(id);
        if (!controlApi) {
          return;
        }

        const {
          rawState: { grow, width, ...controlConfig },
          references: controlReferences,
        } = controlApi.serializeState();

        if (controlReferences && controlReferences.length > 0) {
          references.push(...controlReferences);
        }

        controls.push({
          id,
          grow,
          order: index,
          type: controlApi.type,
          width,
          /** Re-add the `controlConfig` layer on serialize so control group saved object retains shape */
          controlConfig,
        });
      });

      return {
        controls,
        references,
      };
    },
    resetControlsUnsavedChanges: (lastSavedControlsState: ControlPanelsState) => {
      currentControlsState = {
        ...lastSavedControlsState,
      };
      const nextControlsInOrder = getControlsInOrder(currentControlsState as ControlPanelsState);
      controlsInOrder$.next(nextControlsInOrder);

      const nextControlIds = nextControlsInOrder.map(({ id }) => id);
      const children = { ...children$.value };
      let modifiedChildren = false;
      Object.keys(children).forEach((controlId) => {
        if (!nextControlIds.includes(controlId)) {
          // remove children that no longer exist after reset
          delete children[controlId];
          modifiedChildren = true;
        }
      });
      if (modifiedChildren) {
        children$.next(children);
      }
    },
    api: {
      getSerializedStateForChild: (childId: string) => {
        const controlPanelState = currentControlsState[childId];
        return controlPanelState ? { rawState: controlPanelState } : undefined;
      },
      children$: children$ as PublishingSubject<{
        [key: string]: DefaultControlApi;
      }>,
      getPanelCount: () => {
        return controlsInOrder$.value.length;
      },
      addNewPanel: async (panel: PanelPackage<DefaultControlState>) => {
        return addNewPanel(panel, controlsInOrder$.value.length);
      },
      removePanel,
      replacePanel: async (panelId, newPanel) => {
        const index = controlsInOrder$.value.findIndex(({ id }) => id === panelId);
        removePanel(panelId);
        const controlApi = await addNewPanel(
          newPanel,
          index >= 0 ? index : controlsInOrder$.value.length
        );
        return controlApi ? controlApi.uuid : '';
      },
      untilInitialized: () => {
        return new Promise((resolve) => {
          children$
            .pipe(
              first((children) => {
                const atLeastOneControlNotInitialized = initialControlIds.some(
                  (controlId) => !children[controlId]
                );
                return !atLeastOneControlNotInitialized;
              })
            )
            .subscribe(() => {
              resolve();
            });
        });
      },
    } as PresentationContainer &
      HasSerializedChildState<ControlPanelState> &
      Pick<ControlGroupApi, 'untilInitialized'>,
  };
}

export function getLastUsedDataViewId(
  controlsInOrder: ControlsInOrder,
  initialControlPanelsState: ControlPanelsState<Partial<DefaultDataControlState>>
) {
  let dataViewId: string | undefined;
  for (let i = controlsInOrder.length - 1; i >= 0; i--) {
    const controlId = controlsInOrder[i].id;
    const controlState = initialControlPanelsState[controlId];
    if (controlState?.dataViewId) {
      dataViewId = controlState.dataViewId;
      break;
    }
  }
  return dataViewId;
}
