/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { ErrorLike } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { CanLinkToLibrary, CanUnlinkFromLibrary } from '@kbn/presentation-library';
import { BehaviorSubject, Subscription } from 'rxjs';
import { embeddableStart } from '../../../kibana_services';
import {
  FilterableEmbeddableInput,
  isFilterableEmbeddable,
} from '../../filterable_embeddable/types';
import { isReferenceOrValueEmbeddable } from '../../reference_or_value_embeddable';
import { canLinkLegacyEmbeddable, linkLegacyEmbeddable } from './link_legacy_embeddable';

import { EmbeddableOutput, IEmbeddable, LegacyEmbeddableAPI } from '../i_embeddable';
import { canEditEmbeddable, editLegacyEmbeddable } from './edit_legacy_embeddable';
import {
  embeddableInputToSubject,
  embeddableOutputToSubject,
  viewModeToSubject,
} from './embeddable_compatibility_utils';
import { canUnlinkLegacyEmbeddable, unlinkLegacyEmbeddable } from './unlink_legacy_embeddable';

export type CommonLegacyInput = FilterableEmbeddableInput;
export type CommonLegacyOutput = EmbeddableOutput & { dataViews: DataView[] };
export type CommonLegacyEmbeddable = IEmbeddable<CommonLegacyInput, CommonLegacyOutput>;

export const legacyEmbeddableToApi = (
  embeddable: CommonLegacyEmbeddable
): { api: LegacyEmbeddableAPI; destroyAPI: () => void } => {
  const subscriptions = new Subscription();

  /**
   * Shortcuts for creating publishing subjects from the input and output subjects
   */
  const inputKeyToSubject = <T extends unknown = unknown>(
    key: keyof CommonLegacyInput,
    useExplicitInput?: boolean
  ) => embeddableInputToSubject<T>(subscriptions, embeddable, key, useExplicitInput);
  const outputKeyToSubject = <T extends unknown = unknown>(key: keyof CommonLegacyOutput) =>
    embeddableOutputToSubject<T>(subscriptions, embeddable, key);

  /**
   * Support editing of legacy embeddables
   */
  const onEdit = () => editLegacyEmbeddable(embeddable);
  const getTypeDisplayName = () =>
    embeddableStart.getEmbeddableFactory(embeddable.type)?.getDisplayName() ??
    i18n.translate('embeddableApi.compatibility.defaultTypeDisplayName', {
      defaultMessage: 'chart',
    });
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

  const setPanelDescription = (description?: string) => embeddable.updateInput({ description });
  const panelDescription = inputKeyToSubject<string>('description');

  const defaultPanelTitle = outputKeyToSubject<string>('defaultTitle');
  const disabledActionIds = inputKeyToSubject<string[] | undefined>('disabledActions');

  const fatalError = new BehaviorSubject<ErrorLike | undefined>(undefined);
  subscriptions.add(
    embeddable.getOutput$().subscribe({
      next: (output) => fatalError.next(output.error),
      error: (error) => fatalError.next(error),
    })
  );

  // legacy embeddables don't support ID changing or parent changing, so we don't need to subscribe to anything.
  const id = new BehaviorSubject<string>(embeddable.id);
  const parent = new BehaviorSubject<unknown>(embeddable.parent?.getApi() ?? undefined);

  /**
   * We treat all legacy embeddable types as if they can time ranges, because there is no programmatic way
   * to tell when given a legacy embeddable what it's input could contain. All existing actions treat these as optional
   * so if the Embeddable is incapable of publishing unified search state (i.e. markdown) then it will just be ignored.
   */
  const localTimeRange = inputKeyToSubject<TimeRange | undefined>('timeRange', true);
  const setLocalTimeRange = (timeRange?: TimeRange) => embeddable.updateInput({ timeRange });
  const getFallbackTimeRange = () =>
    (embeddable.parent?.getInput() as CommonLegacyInput)?.timeRange;

  /**
   * Legacy Embeddables do not support changing their local filters or queries over the lifetime of the Embeddable.
   * Because of this, we can initialize the subjects with the initial input values and then never update them.
   * Additionally, the setters are present to fulfill the API, but are noops here. The new system will support
   * updating filters and queries on the fly.
   */
  const localFilters = new BehaviorSubject<Filter[] | undefined>(
    isFilterableEmbeddable(embeddable) ? embeddable.getFilters() : undefined
  );
  const setLocalFilters = () => {};
  const localQuery = new BehaviorSubject<Query | AggregateQuery | undefined>(
    isFilterableEmbeddable(embeddable) ? embeddable.getQuery() : undefined
  );
  const setLocalQuery = () => {};

  const dataViews = outputKeyToSubject<DataView[]>('dataViews');

  /**
   * Forward Link & Unlink actions for reference or value embeddables.
   */
  const linkUnlinkFunctions: (CanLinkToLibrary & CanUnlinkFromLibrary) | {} =
    isReferenceOrValueEmbeddable(embeddable)
      ? {
          canLinkToLibrary: () => canLinkLegacyEmbeddable(embeddable),
          linkToLibrary: () => linkLegacyEmbeddable(embeddable),

          canUnlinkFromLibrary: () => canUnlinkLegacyEmbeddable(embeddable),
          unlinkFromLibrary: () => unlinkLegacyEmbeddable(embeddable),
        }
      : {};

  /**
   * Forward any additional external API functions
   */
  const additionalFunctions = embeddable.getExternalApiFunctions?.();

  return {
    api: {
      id,
      parent,
      viewMode,
      dataLoading,
      fatalError,

      onEdit,
      isEditingEnabled,
      getTypeDisplayName,
      type: embeddable.type,
      getInspectorAdapters: () => embeddable.getInspectorAdapters(),

      localQuery,
      setLocalQuery,
      localFilters,
      setLocalFilters,
      localTimeRange,
      setLocalTimeRange,
      getFallbackTimeRange,

      dataViews,
      disabledActionIds,

      panelTitle,
      setPanelTitle,
      defaultPanelTitle,

      hidePanelTitle,
      setHidePanelTitle,

      setPanelDescription,
      panelDescription,

      ...linkUnlinkFunctions,
      ...additionalFunctions,
    },
    destroyAPI: () => {
      subscriptions.unsubscribe();
    },
  };
};
