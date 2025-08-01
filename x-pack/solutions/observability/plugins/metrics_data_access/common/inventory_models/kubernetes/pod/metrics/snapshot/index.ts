/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricConfigMap } from '../../../../shared/metrics/types';
import { cpu } from './cpu';
import { memory } from './memory';
import { rx } from './rx';
import { tx } from './tx';

export const snapshot = {
  memory,
  cpu,
  rx,
  tx,
} satisfies MetricConfigMap;

export type PodAggregations = typeof snapshot;
