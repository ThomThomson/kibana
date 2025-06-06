/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import fetch from 'node-fetch';

import { fleetServerHostService } from '../../services/fleet_server_host';

import type { FleetRequestHandler, PostHealthCheckRequestSchema } from '../../types';

export const postHealthCheckHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostHealthCheckRequestSchema.body>
> = async (context, request, response) => {
  const abortController = new AbortController();
  const { id } = request.body;
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;

  try {
    const fleetServerHost = await fleetServerHostService.get(soClient, id);

    if (
      !fleetServerHost ||
      !fleetServerHost?.host_urls ||
      fleetServerHost?.host_urls?.length === 0
    ) {
      return response.badRequest({
        body: {
          message: `The requested host id ${id} does not have associated host urls.`,
        },
      });
    }

    // Sometimes when the host is not online, the request hangs
    // Setting a timeout to abort the request after 5s
    setTimeout(() => {
      abortController.abort();
    }, 5000);
    const host = fleetServerHost.host_urls[0];

    const res = await fetch(`${host}/api/status`, {
      headers: {
        accept: '*/*',
      },
      method: 'GET',
      signal: abortController.signal,
    });
    const bodyRes = await res.json();
    const body = { ...bodyRes };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: {
          message: `The requested host id ${request.body.id} does not exist.`,
        },
      });
    }

    // when the request is aborted, return offline status
    if (error.name === 'AbortError' || error.message.includes('user aborted')) {
      return response.ok({
        body: { status: `OFFLINE`, host_id: request.body.id },
      });
    }
    throw error;
  }
};
