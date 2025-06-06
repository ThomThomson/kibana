/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResetSLOResponse } from '@kbn/slo-schema';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useResetSlo() {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const { sloClient } = usePluginContext();

  return useMutation<ResetSLOResponse, ServerError, { id: string; name: string }>(
    ['resetSlo'],
    ({ id }) => {
      return sloClient.fetch('POST /api/observability/slos/{id}/_reset 2023-10-31', {
        params: { path: { id } },
      });
    },
    {
      onError: (error, { name, id }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.slo.reset.errorNotification', {
            defaultMessage: 'Failed to reset {name} (id: {id})',
            values: { name, id },
          }),
        });
      },
      onSuccess: (_data, { name, id }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });
        queryClient.invalidateQueries({ queryKey: sloKeys.historicalSummaries(), exact: false });
        queryClient.invalidateQueries({ queryKey: sloKeys.details(), exact: false });
        queryClient.invalidateQueries({ queryKey: sloKeys.allDefinitions(), exact: false });

        toasts.addSuccess(
          i18n.translate('xpack.slo.slo.reset.successNotification', {
            defaultMessage: '{name} reset successfully',
            values: { name },
          })
        );
      },
    }
  );
}
