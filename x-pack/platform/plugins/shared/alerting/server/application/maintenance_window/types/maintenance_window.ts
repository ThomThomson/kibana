/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { maintenanceWindowStatus } from '../constants';
import type { maintenanceWindowSchema } from '../schemas';

export type MaintenanceWindow = TypeOf<typeof maintenanceWindowSchema>;
export type MaintenanceWindowStatus =
  (typeof maintenanceWindowStatus)[keyof typeof maintenanceWindowStatus];

export type MaintenanceWindowWithoutComputedProperties = Omit<
  MaintenanceWindow,
  'id' | 'eventStartTime' | 'eventEndTime' | 'status'
>;
