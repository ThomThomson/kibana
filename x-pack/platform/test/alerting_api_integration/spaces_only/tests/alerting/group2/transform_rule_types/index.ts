/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function alertingTests({ loadTestFile }: FtrProviderContext) {
  describe('transform alert rule types', function () {
    loadTestFile(require.resolve('./transform_health'));
  });
}
