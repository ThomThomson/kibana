/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer as DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import { useDispatch } from 'react-redux';
import { InputsModelId } from '../../common/store/inputs/constants';
import { inputsActions } from '../../common/store/inputs';
import { useKibana } from '../../common/lib/kibana';
import { APP_ID } from '../../../common';

const DashboardRendererComponent = ({
  canReadDashboard,
  dashboardContainer,
  filters,
  id,
  inputId = InputsModelId.global,
  onDashboardContainerLoaded,
  query,
  savedObjectId,
  timeRange,
  viewMode = ViewMode.VIEW,
}: {
  canReadDashboard: boolean;
  dashboardContainer?: DashboardAPI;
  filters?: Filter[];
  id: string;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  onDashboardContainerLoaded?: (dashboardContainer: DashboardAPI) => void;
  query?: Query;
  savedObjectId: string | undefined;
  timeRange: {
    from: string;
    fromStr?: string | undefined;
    to: string;
    toStr?: string | undefined;
  };
  viewMode?: ViewMode;
}) => {
  const { embeddable } = useKibana().services;
  const dispatch = useDispatch();
  const getCreationOptions = useCallback(
    () =>
      Promise.resolve({
        getInitialInput: () => ({ timeRange, viewMode, query, filters }),
        getIncomingEmbeddable: () =>
          embeddable.getStateTransfer().getIncomingEmbeddablePackage(APP_ID, true),
      }),
    [embeddable, filters, query, timeRange, viewMode]
  );

  const refetchByForceRefresh = useCallback(() => {
    dashboardContainer?.forceRefresh();
  }, [dashboardContainer]);

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId,
        id,
        refetch: refetchByForceRefresh,
        loading: false,
        inspect: null,
      })
    );
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId, id }));
    };
  }, [dispatch, id, inputId, refetchByForceRefresh]);

  useEffect(() => {
    dashboardContainer?.updateInput({ timeRange, query, filters });
  }, [dashboardContainer, filters, query, timeRange]);

  return savedObjectId && canReadDashboard ? (
    <DashboardContainerRenderer
      ref={onDashboardContainerLoaded}
      savedObjectId={savedObjectId}
      getCreationOptions={getCreationOptions}
    />
  ) : null;
};
DashboardRendererComponent.displayName = 'DashboardRendererComponent';
export const DashboardRenderer = React.memo(DashboardRendererComponent);
