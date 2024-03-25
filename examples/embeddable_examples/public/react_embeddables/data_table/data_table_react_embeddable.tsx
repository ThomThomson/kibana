/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { css } from '@emotion/react';
import { CellActionsProvider } from '@kbn/cell-actions';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  apiPublishesDataViews,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { DataLoadingState, UnifiedDataTable } from '@kbn/unified-data-table';
import React, { useEffect } from 'react';
import { EmbeddableExamplesStartDependencies } from '../../plugin';
import { apiPublishesSelectedFields } from '../field_list/publishes_selected_fields';
import { DATA_TABLE_ID } from './constants';
import { initializeDataTableQueries } from './data_table_queries';
import { DataTableApi, DataTableProvider, DataTableSerializedState } from './types';

export const isDataTableProvider = (api: unknown): api is DataTableProvider => {
  return apiPublishesDataViews(api) && apiPublishesSelectedFields(api);
};

export const getDataTableFactory = (
  core: CoreStart,
  services: EmbeddableExamplesStartDependencies
): ReactEmbeddableFactory<DataTableSerializedState, DataTableApi> => ({
  type: DATA_TABLE_ID,
  deserializeState: (state) => {
    return state.rawState as DataTableSerializedState;
  },
  buildEmbeddable: async (initialState, buildApi) => {
    // initialize embeddable state
    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);

    // initialize services
    const storage = new Storage(localStorage);
    const { forceRefresh, queryLoading$, startQueryService } = await initializeDataTableQueries(
      services
    );
    const allServices = {
      ...services,
      storage,
      theme: core.theme,
      uiSettings: core.uiSettings,
      toastNotifications: core.notifications.toasts,
    };

    const api = buildApi(
      {
        ...titlesApi,
        forceRefresh,
        dataLoading: queryLoading$,
        serializeState: () => {
          return {
            rawState: serializeTitles(),
          };
        },
      },
      titleComparators
    );

    // Start the data table query service
    const { rows$, fields$, dataView$, stopQueryService } = startQueryService(api);

    // Create the React Embeddable component
    return {
      api,
      Component: () => {
        // unwrap publishing subjects into reactive state
        const [fields, rows, loading, dataView] = useBatchedPublishingSubjects(
          fields$,
          rows$,
          queryLoading$,
          dataView$
        );

        // stop query service on unmount
        useEffect(() => {
          return () => {
            stopQueryService();
          };
        }, []);

        return (
          <>
            <EuiScreenReaderOnly>
              <span id="dataTableReactEmbeddableAria">
                {i18n.translate('embeddableExamples.dataTable.ariaLabel', {
                  defaultMessage: 'Data table',
                })}
              </span>
            </EuiScreenReaderOnly>
            <div
              css={css`
                width: 100%;
              `}
            >
              <KibanaRenderContextProvider theme={core.theme} i18n={core.i18n}>
                <KibanaContextProvider services={allServices}>
                  <CellActionsProvider
                    getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
                  >
                    <UnifiedDataTable
                      sort={[]}
                      rows={rows}
                      showTimeCol={true}
                      onFilter={() => {}}
                      dataView={dataView}
                      sampleSizeState={100}
                      columns={fields ?? []}
                      useNewFieldsApi={true}
                      services={allServices}
                      onSetColumns={() => {}}
                      ariaLabelledBy="dataTableReactEmbeddableAria"
                      loadingState={loading ? DataLoadingState.loading : DataLoadingState.loaded}
                    />
                  </CellActionsProvider>
                </KibanaContextProvider>
              </KibanaRenderContextProvider>
            </div>
          </>
        );
      },
    };
  },
});
