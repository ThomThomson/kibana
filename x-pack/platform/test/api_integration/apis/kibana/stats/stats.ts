/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestNoAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const config = getService('config');

  describe('/api/stats', () => {
    describe('operational stats and usage stats', () => {
      // lazy check for uuid for test runs against preexisting services
      function isUUID(uuid: string) {
        return typeof uuid === 'string' && uuid.length === 36;
      }

      describe('no auth', () => {
        // depends on kibana.yml setting status.allowAnonymous
        // skip this test when running against a remote host, as we can't
        // validate the status of this setting
        const host = config.get('servers.kibana.hostname');
        const ifLocalhost = host.includes('localhost') ? it : it.skip;
        ifLocalhost('should return 200 and stats for no extended', async () => {
          const { body } = await supertestNoAuth.get('/api/stats').expect(200);
          expect(isUUID(body.kibana.uuid)).to.be.ok();
        });

        it('should return 200 for extended', async () => {
          const { body } = await supertestNoAuth.get('/api/stats').expect(200);
          expect(isUUID(body.kibana.uuid)).to.be.ok();
        });
      });

      describe('with auth', () => {
        it('should return 200 and stats for no extended', async () => {
          const { body } = await supertest.get('/api/stats').expect(200);
          expect(isUUID(body.kibana.uuid)).to.be.ok();
        });

        it('should return 200 for extended', async () => {
          const { body } = await supertest.get('/api/stats?extended').expect(200);
          expect(isUUID(body.kibana.uuid)).to.be.ok();
        });

        it('should return 200 for extended and legacy', async () => {
          const { body } = await supertest.get('/api/stats?extended&legacy').expect(200);
          expect(isUUID(body.kibana.uuid)).to.be.ok();
        });
      });
    });
  });
}
