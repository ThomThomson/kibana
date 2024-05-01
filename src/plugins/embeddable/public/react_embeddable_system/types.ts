/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { HasSerializableState, SerializedPanelState } from '@kbn/presentation-containers';
import { DefaultPresentationPanelApi } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import {
  HasType,
  PublishesUnsavedChanges,
  SavesExternalState,
  StateComparators,
} from '@kbn/presentation-publishing';
import React from 'react';

/**
 * The default embeddable API that all Embeddables must implement.
 *
 * Before adding anything to this interface, please be certain that it belongs in *every* embeddable.
 */
export interface DefaultEmbeddableApi<SerializedState extends object = object>
  extends DefaultPresentationPanelApi,
    HasType,
    PublishesUnsavedChanges,
<<<<<<< HEAD
    HasSerializableState<SerializedState>,
    Partial<SavesExternalState> {}
=======
    HasSerializableState<SerializedState> {}
>>>>>>> upstream/main

/**
 * A subset of the default embeddable API used in registration to allow implementors to omit aspects
 * of the API that will be automatically added by the system.
 */
export type ReactEmbeddableApiRegistration<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
> = Omit<Api, 'uuid' | 'parent' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges'>;

/**
 * The React Embeddable Factory interface is used to register a series of functions that
 * create and manage an embeddable instance.
 *
 * Embeddables are React components that manage their own state, can be serialized and
 * deserialized, and return an API that can be used to interact with them imperatively.
 * provided by the parent, and will not save any state to an external store.
 **/
export interface ReactEmbeddableFactory<
  SerializedState extends object = object,
<<<<<<< HEAD
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>,
  RuntimeState extends object = SerializedState,
  ExternalState extends object = {}
=======
  ApiType extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>,
  RuntimeState extends object = SerializedState
>>>>>>> upstream/main
> {
  /**
   * A unique key for the type of this embeddable. The React Embeddable Renderer will use this type
   * to find this factory.
   */
  type: string;

  /**
<<<<<<< HEAD
   * An optional async function that loads state from some external store. This function
   * takes the most recent state from the parent and returns some loaded external state.
   *
   * If this is provided, your API should also extend {@link SavesExternalState} to allow
   * the embeddable to save back to the external state store.
   */
  loadExternalState?: (
    panelState: SerializedPanelState<SerializedState> | undefined
  ) => Promise<SerializedPanelState<ExternalState> | undefined>;

  /**
=======
>>>>>>> upstream/main
   * A required synchronous function that transforms serialized state into runtime state.
   * This will be used twice - once for the parent state, and once for the last saved state
   * for comparison.
   *
<<<<<<< HEAD
   * If `loadExternalState` is provided, this function will be called with the result of that.
   *
=======
>>>>>>> upstream/main
   * This can also be used to:
   *
   * - Inject references provided by the parent
   * - Migrate the state to a newer version (this must be undone when serializing)
   */
<<<<<<< HEAD
  deserializeState: (
    panelState: SerializedPanelState<SerializedState>,
    externalState?: SerializedPanelState<ExternalState>
  ) => RuntimeState;
=======
  deserializeState: (state: SerializedPanelState<SerializedState>) => RuntimeState;
>>>>>>> upstream/main

  /**
   * A required async function that builds your embeddable component and a linked API instance. The API
   * and component will be combined together by the ReactEmbeddableRenderer. Initial state will contain the result of
   * the deserialize function.
   *
   * The returned API must extend {@link HasSerializableState} which does the opposite of the deserializeState
   * function.
   */
  buildEmbeddable: (
    initialState: RuntimeState,
    buildApi: (
<<<<<<< HEAD
      apiRegistration: ReactEmbeddableApiRegistration<SerializedState, Api>,
      comparators: StateComparators<RuntimeState>
    ) => Api,
=======
      apiRegistration: ReactEmbeddableApiRegistration<SerializedState, ApiType>,
      comparators: StateComparators<RuntimeState>
    ) => ApiType,
>>>>>>> upstream/main
    uuid: string,
    parentApi?: unknown
  ) => Promise<{ Component: React.FC<{}>; api: Api }>;
}

export type AnyReactEmbeddableFactory = ReactEmbeddableFactory<any, any, any, any>;
