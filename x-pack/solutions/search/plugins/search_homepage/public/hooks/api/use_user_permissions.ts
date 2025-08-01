/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { UserStartPrivilegesResponse } from '../../../common/types';
import { QueryKeys } from '../../constants';

import { useKibana } from '../use_kibana';
import { GET_USER_PRIVILEGES_ROUTE } from '../../../common/routes';

export const useUserPrivilegesQuery = (indexName: string) => {
  const { http } = useKibana().services;
  return useQuery({
    queryKey: [QueryKeys.FetchUserStartPrivileges],
    queryFn: () =>
      http.get<UserStartPrivilegesResponse>(
        GET_USER_PRIVILEGES_ROUTE.replace('{indexName}', indexName)
      ),
  });
};
