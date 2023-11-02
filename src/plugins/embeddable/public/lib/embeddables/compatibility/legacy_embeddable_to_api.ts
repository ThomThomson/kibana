/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject, distinctUntilKeyChanged, map, Subscription } from 'rxjs';
import { PanelEmbeddable } from '../../../embeddable_panel/types';
import { embeddableStart } from '../../../kibana_services';
import { ViewMode as LegacyViewMode } from '../../types';
import { EmbeddableInput, EmbeddableOutput, LegacyEmbeddableAPI } from '../i_embeddable';
import { canEditEmbeddable, editLegacyEmbeddable } from './edit_legacy_embeddable';

const embeddableInputToSubject = <T extends unknown = unknown>(
  subscription: Subscription,
  embeddable: PanelEmbeddable,
  key: keyof EmbeddableInput
) => {
  const subject = new BehaviorSubject<T | undefined>(embeddable.getInput()[key] as T);
  subscription.add(
    embeddable
      .getInput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => subject.next(embeddable.getInput()[key] as T))
  );
  return subject;
};

const embeddableOutputToSubject = <T extends unknown = unknown>(
  subscription: Subscription,
  embeddable: PanelEmbeddable,
  key: keyof EmbeddableOutput
) => {
  const subject = new BehaviorSubject<T | undefined>(embeddable.getOutput()[key] as T);
  subscription.add(
    embeddable
      .getOutput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => subject.next(embeddable.getOutput()[key] as T))
  );
  return subject;
};

const mapLegacyViewModeToViewMode = (legacyViewMode?: LegacyViewMode): ViewMode => {
  if (!legacyViewMode) return 'view';
  switch (legacyViewMode) {
    case LegacyViewMode.VIEW: {
      return 'view';
    }
    case LegacyViewMode.EDIT: {
      return 'edit';
    }
    case LegacyViewMode.PREVIEW: {
      return 'preview';
    }
    case LegacyViewMode.PRINT: {
      return 'print';
    }
    default: {
      return 'view';
    }
  }
};

const viewModeToSubject = (subscription: Subscription, embeddable: PanelEmbeddable) => {
  const subject = new BehaviorSubject<ViewMode>(
    mapLegacyViewModeToViewMode(embeddable.getInput().viewMode)
  );
  subscription.add(
    embeddable
      .getInput$()
      .pipe(
        distinctUntilKeyChanged('viewMode'),
        map(({ viewMode }) => mapLegacyViewModeToViewMode(viewMode))
      )
      .subscribe((viewMode) => subject.next(viewMode))
  );
  return subject;
};

export const legacyEmbeddableToApi = (
  embeddable: PanelEmbeddable
): { api: LegacyEmbeddableAPI; destroyAPI: () => void } => {
  // data views
  // disabled action ids
  // fatal errors
  // local unified serach

  const subscriptions = new Subscription();
  const inputKeyToSubject = <T extends unknown = unknown>(key: keyof EmbeddableInput) =>
    embeddableInputToSubject<T>(subscriptions, embeddable, key);
  const outputKeyToSubject = <T extends unknown = unknown>(key: keyof EmbeddableOutput) =>
    embeddableOutputToSubject<T>(subscriptions, embeddable, key);

  /**
   * Support editing of legacy embeddables
   */
  const onEdit = () => editLegacyEmbeddable(embeddable);
  const getTypeDisplayName = () =>
    embeddableStart.getEmbeddableFactory(embeddable.type)!.getDisplayName();
  const isEditingEnabled = () => canEditEmbeddable(embeddable);

  /**
   * Publish state for Presentation panel
   */
  const viewMode = viewModeToSubject(subscriptions, embeddable);
  const dataLoading = outputKeyToSubject<boolean>('loading');

  const setHidePanelTitle = (hidePanelTitle?: boolean) =>
    embeddable.updateInput({ hidePanelTitles: hidePanelTitle });
  const hidePanelTitle = inputKeyToSubject<boolean>('hidePanelTitles');

  const setPanelTitle = (title?: string) => embeddable.updateInput({ title });
  const panelTitle = inputKeyToSubject<string>('title');

  const defaultPanelTitle = outputKeyToSubject<string>('defaultTitle');

  const setPanelDescription = (description?: string) => embeddable.updateInput({ description });
  const panelDescription = inputKeyToSubject<string>('description');

  // legacy embeddables don't support ID changing or parent changing, so we don't need to subscribe to anything.
  const id = new BehaviorSubject<string>(embeddable.id);
  const parent = new BehaviorSubject<unknown>(embeddable.parent?.getApi() ?? undefined);

  /**
   * Forward any additional external API functions
   */
  const additionalFunctions = embeddable.getExternalApiFunctions?.();

  // TODO find a way to get type here.

  return {
    api: {
      type: embeddable.type,
      getInspectorAdapters: () => embeddable.getInspectorAdapters(),

      onEdit,
      isEditingEnabled,
      getTypeDisplayName,

      id,
      parent,
      viewMode,
      dataLoading,

      panelTitle,
      setPanelTitle,
      defaultPanelTitle,

      hidePanelTitle,
      setHidePanelTitle,

      setPanelDescription,
      panelDescription,

      ...additionalFunctions,
    },
    destroyAPI: () => {
      subscriptions.unsubscribe();
    },
  };
};
