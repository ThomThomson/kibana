/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({
  indices: schema.arrayOf(schema.string()),
  maxNumSegments: schema.maybe(schema.number()),
});

export function registerForcemergeRoute({ router, lib }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/indices/forcemerge'),
      validate: {
        body: bodySchema,
      },
    },
    async (ctx, req, res) => {
      const { maxNumSegments, indices = [] } = req.body as typeof bodySchema.type;
      const params = {
        expandWildcards: 'none',
        index: indices,
      };

      if (maxNumSegments) {
        (params as any).max_num_segments = maxNumSegments;
      }

      try {
        await ctx.core.elasticsearch.legacy.client.callAsCurrentUser('indices.forcemerge', params);
        return res.ok();
      } catch (e) {
        if (lib.isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        throw e;
      }
    }
  );
}
