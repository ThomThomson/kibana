/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';
import { EmbeddableStart, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { ExpressionRendererParams, useExpressionRenderer } from '@kbn/expressions-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasDisableTriggers,
  apiHasExecutionContext,
  apiPublishesSettings,
  apiHasAppContext,
  apiPublishesUnifiedSearch,
  fetch$,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { isEqual } from 'lodash';
import React, { useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../common/constants';
import { urlFor } from '../utils/saved_visualize_utils';
import type { Vis } from '../vis';
import { createVisAsync } from '../vis_async';
import { getExpressionRendererProps } from './get_expression_renderer_props';
import type { VisualizeApi, VisualizeSerializedState } from './types';

export const getVisualizeEmbeddableFactory = (embeddableStart: EmbeddableStart) => {
  const visualizeEmbeddableFactory: ReactEmbeddableFactory<VisualizeSerializedState, VisualizeApi> =
    {
      type: VISUALIZE_EMBEDDABLE_TYPE,
      deserializeState: (state) => {
        return state.rawState as VisualizeSerializedState;
      },
      buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
        const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
        const vis = await createVisAsync(state.savedVis.type, state.savedVis);

        const id$ = new BehaviorSubject<string>(state.id);
        const vis$ = new BehaviorSubject<Vis>(vis);
        const savedVis$ = new BehaviorSubject(state.savedVis);
        const searchSessionId$ = new BehaviorSubject<string | undefined>('');
        const timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
        const expressionParams$ = new BehaviorSubject<ExpressionRendererParams>({
          expression: '',
        });
        const expressionAbortController$ = new BehaviorSubject<AbortController>(
          new AbortController()
        );
        const executionContext = apiHasExecutionContext(parentApi)
          ? parentApi.executionContext
          : undefined;
        const disableTriggers = apiHasDisableTriggers(parentApi)
          ? parentApi.disableTriggers
          : undefined;
        const parentApiContext = apiHasAppContext(parentApi)
          ? parentApi.getAppContext()
          : undefined;

        const api = buildApi(
          {
            ...titlesApi,
            serializeState: () => {
              return {
                rawState: {
                  ...serializeTitles(),
                  id: id$.getValue(),
                  savedVis: vis$.getValue().serialize(),
                },
              };
            },
            getVis: () => vis$.getValue(),
            getTypeDisplayName: () =>
              i18n.translate('visualizations.displayName', {
                defaultMessage: 'visualization',
              }),
            onEdit: async () => {
              const stateTransferService = embeddableStart.getStateTransfer();
              const visId = vis$.getValue().id;
              const editPath = visId ? urlFor(visId) : '#/edit_by_value';
              await stateTransferService.navigateToEditor('visualize', {
                path: editPath,
                state: {
                  embeddableId: uuid,
                  valueInput: {
                    savedVis: savedVis$.getValue(),
                    title: api.panelTitle?.getValue(),
                    description: api.panelDescription?.getValue(),
                    timeRange: timeRange$.getValue(),
                  },
                  originatingApp: parentApiContext?.currentAppId ?? '',
                  searchSessionId: searchSessionId$.getValue() || undefined,
                  originatingPath: parentApiContext?.getCurrentPath?.(),
                },
              });
            },
            isEditingEnabled: () => true,
          },
          {
            ...titleComparators,
            id: [id$, (value) => id$.next(value)],
            savedVis: [
              savedVis$,
              async (value) => {
                savedVis$.next(value);
                vis$.next(await createVisAsync(value.type, value));
              },
              (a, b) => isEqual(a, b),
            ],
          }
        );
        fetch$(api).subscribe(async (data) => {
          const unifiedSearch = apiPublishesUnifiedSearch(parentApi)
            ? {
                query: data.query,
                filters: data.filters,
                timeRange: data.timeRange,
              }
            : {};
          const searchSessionId = apiPublishesSearchSession(parentApi) ? data.searchSessionId : '';
          timeRange$.next(data.timeRange);
          searchSessionId$.next(searchSessionId);
          const settings = apiPublishesSettings(parentApi)
            ? {
                syncColors: parentApi.settings.syncColors$.getValue(),
                syncCursor: parentApi.settings.syncCursor$.getValue(),
                syncTooltips: parentApi.settings.syncTooltips$.getValue(),
              }
            : {};

          const { params, abortController } = await getExpressionRendererProps({
            unifiedSearch,
            vis: vis$.getValue(),
            settings,
            disableTriggers,
            searchSessionId,
            parentExecutionContext: executionContext,
            abortController: expressionAbortController$.getValue(),
          });
          if (params) expressionParams$.next(params);
          expressionAbortController$.next(abortController);
        });

        return {
          api,
          Component: () => {
            const expressionParams = useStateFromPublishingSubject(expressionParams$);
            const domNode = useRef<HTMLDivElement>(null);
            useExpressionRenderer(domNode, expressionParams);

            return (
              <div style={{ width: '100%', height: '100%' }} ref={domNode}>
                {/* Replicate the loading state for the expression renderer to avoid FOUC  */}
                <EuiFlexGroup
                  style={{ height: '100%' }}
                  justifyContent="center"
                  alignItems="center"
                >
                  <EuiLoadingChart size="l" mono />
                </EuiFlexGroup>
              </div>
            );
          },
        };
      },
    };
  return visualizeEmbeddableFactory;
};
