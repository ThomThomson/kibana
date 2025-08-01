/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { FLEET_AGENT_POLICIES_SCHEMA_VERSION } from '@kbn/fleet-plugin/server/constants';
import { skipIfNoDockerRegistry, generateAgent } from '../../helpers';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const getPackage = async (pkgName: string) => {
    const getPkgRes = await supertest
      .get(`/api/fleet/epm/packages/${pkgName}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
    return getPkgRes;
  };
  const epmInstall = async (pkgName: string, pkgVersion: string) => {
    const getPkgRes = await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
    return getPkgRes;
  };

  describe('fleet_agent_policies', () => {
    skipIfNoDockerRegistry(providerContext);

    let agentPolicyWithPPId: string;

    async function createAgentPolicyWithPackagePolicy() {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 1',
          namespace: 'default',
          force: true,
        })
        .expect(200);
      agentPolicyWithPPId = agentPolicyResponse.item.id;

      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyWithPPId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'single_input_no_streams',
            version: '0.1.0',
          },
        });
    }

    describe('GET /api/fleet/agent_policies', () => {
      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();
        await createAgentPolicyWithPackagePolicy();
      });
      after(async () => {
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: agentPolicyWithPPId })
          .expect(200);
      });
      it('should get list agent policies', async () => {
        await supertest.get(`/api/fleet/agent_policies`).expect(200);
      });

      it('should get list agent policies simplified format', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies?full=true&format=simplified`)
          .expect(200);
        expect(body.items[0].package_policies[0].inputs).to.eql({
          single_input: { enabled: true, streams: {} },
        });
      });

      it('should get one agent policy simplified format', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyWithPPId}?format=simplified`)
          .expect(200);
        expect(body.item.package_policies[0].inputs).to.eql({
          single_input: { enabled: true, streams: {} },
        });
      });

      it('should get a list of agent policies by kuery', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'default',
          })
          .expect(200);
        const { body } = await supertest
          .get(
            `/api/fleet/agent_policies?kuery=ingest-agent-policies.name:TEST&withAgentCount=true`
          )
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(body.items.length).to.eql(1);
        const { id, updated_at: updatedAt, version, ...rest } = body.items[0];
        expectSnapshot(rest).toMatch();
      });

      it('should return 200 even if the passed kuery does not have prefix ingest-agent-policies', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST-1',
            namespace: 'default',
          })
          .expect(200);
        await supertest
          .get(`/api/fleet/agent_policies?kuery=name:TEST-1`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('with enableStrictKQLValidation should return 400 if passed kuery is not correct', async () => {
        await supertest
          .get(`/api/fleet/agent_policies?kuery=ingest-agent-policies.non_existent_parameter:test`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('with enableStrictKQLValidation should return 400 if passed kuery is invalid', async () => {
        await supertest
          .get(`/api/fleet/agent_policies?kuery='test%3A'`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });
    });

    describe('POST /api/fleet/agent_policies', () => {
      let systemPkgVersion: string;
      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();
      });
      let packagePoliciesToDeleteIds: string[] = [];
      after(async () => {
        if (systemPkgVersion) {
          await supertest.delete(`/api/fleet/epm/packages/system/${systemPkgVersion}`);
        }
        if (packagePoliciesToDeleteIds.length > 0) {
          await kibanaServer.savedObjects.bulkDelete({
            objects: packagePoliciesToDeleteIds.map((id) => ({
              id,
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            })),
          });
        }

        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });
      it('should work with valid minimum required values', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'default',
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        expect(body.item.is_managed).to.equal(false);
        expect(body.item.inactivity_timeout).to.equal(1209600);
        expect(body.item.status).to.be('active');
      });

      it('sets given is_managed value', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST2',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        expect(body.item.is_managed).to.equal(true);

        const {
          body: { item: createdPolicy2 },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST3',
            namespace: 'default',
            is_managed: false,
          })
          .expect(200);

        const {
          body: { item: policy2 },
        } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy2.id}`);
        expect(policy2.is_managed).to.equal(false);
      });

      it('does not allow arbitrary config in agent_features value', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-agent-features',
            namespace: 'default',
            agent_features: [
              {
                name: 'fqdn',
                enabled: true,
                config: "I'm not allowed yet",
              },
            ],
          })
          .expect(400);
      });

      it('sets given agent_features value', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-agent-features',
            namespace: 'default',
            agent_features: [
              {
                name: 'fqdn',
                enabled: true,
              },
            ],
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        expect(body.item.agent_features).to.eql([
          {
            name: 'fqdn',
            enabled: true,
          },
        ]);

        const policyDocRes = await es.search({
          index: '.fleet-policies',
          query: {
            term: {
              policy_id: createdPolicy.id,
            },
          },
        });

        // @ts-expect-error
        expect(policyDocRes?.hits?.hits[0]?._source?.data?.agent?.features).to.eql({
          fqdn: {
            enabled: true,
          },
        });
      });

      it('should create .fleet-policies document with inputs', async () => {
        const res = await supertest
          .post(`/api/fleet/agent_policies?sys_monitoring=true`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-policy-with-system',
            namespace: 'default',
            force: true, // using force to bypass package verification error
          })
          .expect(200);

        const policyDocRes = await es.search({
          index: '.fleet-policies',
          query: {
            term: {
              policy_id: res.body.item.id,
            },
          },
        });

        expect(policyDocRes?.hits?.hits.length).to.eql(1);
        const source = policyDocRes?.hits?.hits[0]?._source as any;
        expect(source?.revision_idx).to.eql(1);
        expect(source?.data?.inputs.length).to.eql(4);
      });

      it('should return a 400 with an empty namespace', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: '',
          })
          .expect(400);
      });

      it('should return a 400 with an empty name', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: '  ',
            namespace: 'default',
          })
          .expect(400);
      });

      it('should return a 400 with an invalid namespace', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'InvalidNamespace',
          })
          .expect(400);
      });

      it('should return a 409 if policy already exists with name given', async () => {
        const sharedBody = {
          name: 'Name 1',
          namespace: 'default',
        };

        // first one succeeds
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(200);

        // second one fails because name exists
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(409);
      });

      it('should create policy with provided id and return 409 the second time', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'test-id',
            name: 'TEST ID',
            namespace: 'default',
          })
          .expect(200);

        expect(createdPolicy.id).to.equal('test-id');

        // second one fails because id exists
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'test-id',
            name: 'TEST 2 ID',
            namespace: 'default',
          })
          .expect(409);
      });

      it('should allow to create policy with the system integration policy and increment correctly the name if package policies are more than 10', async () => {
        // load a bunch of fake system integration policy
        const policyIds = new Array(10).fill(null).map((_, i) => `package-policy-test-${i}`);
        packagePoliciesToDeleteIds = packagePoliciesToDeleteIds.concat(policyIds);
        const getPkRes = await getPackage('system');
        systemPkgVersion = getPkRes.body.item.version;
        // we must first force install the system package to override package verification error on policy create
        const installPromise = await epmInstall('system', `${systemPkgVersion}`);

        await Promise.all([
          installPromise,
          ...policyIds.map((policyId, i) =>
            kibanaServer.savedObjects.create({
              id: policyId,
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              overwrite: true,
              attributes: {
                name: `system-${i + 1}`,
                package: {
                  name: 'system',
                },
                latest_revision: true,
              },
            })
          ),
        ]);

        // first one succeeds
        const res = await supertest
          .post(`/api/fleet/agent_policies`)
          .query({
            sys_monitoring: true,
          })
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Policy with system monitoring ${Date.now()}`,
            namespace: 'default',
          })
          .expect(200);

        const {
          body: { items: policies },
        } = await supertest.get(`/api/fleet/agent_policies?full=true`).expect(200);

        const policy = policies.find((p: any) => (p.id = res.body.item.id));

        expect(policy.package_policies[0].name).be('system-11');
      });

      it('should allow to create policy with the system integration policy and increment correctly the name', async () => {
        // load a bunch of fake system integration policy
        await kibanaServer.savedObjects.create({
          id: 'package-policy-1',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          overwrite: true,
          attributes: {
            name: 'system-456',
            package: {
              name: 'system',
            },
            latest_revision: true,
          },
        });
        packagePoliciesToDeleteIds.push('package-policy-1');
        await kibanaServer.savedObjects.create({
          id: 'package-policy-2',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          overwrite: true,
          attributes: {
            name: 'system-123',
            package: {
              name: 'system',
            },
            latest_revision: true,
          },
        });
        packagePoliciesToDeleteIds.push('package-policy-2');

        // first one succeeds
        const res = await supertest
          .post(`/api/fleet/agent_policies`)
          .query({
            sys_monitoring: true,
          })
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Policy with system monitoring ${Date.now()}`,
            namespace: 'default',
          })
          .expect(200);

        const {
          body: { items: policies },
        } = await supertest.get(`/api/fleet/agent_policies?full=true`).expect(200);

        const policy = policies.find((p: any) => (p.id = res.body.item.id));

        expect(policy.package_policies[0].name).be('system-457');
      });

      it('should create policy with global data tags given valid tags', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies?sys_monitoring=true`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'global data tag test',
            namespace: 'default',
            global_data_tags: [
              { name: 'testName', value: 'testValue' },
              { name: 'testName2', value: 123 },
            ],
          })
          .expect(200);

        let res = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`).expect(200);
        expect(res.body.item.global_data_tags).to.eql([
          { name: 'testName', value: 'testValue' },
          { name: 'testName2', value: 123 },
        ]);

        res = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}/full`).expect(200);
        for (const input of res.body.item.inputs) {
          expect(input.processors).not.to.equal(undefined);
          expect(input.processors.length).to.equal(1);
          const addFields = input.processors[0].add_fields;
          expect(addFields).to.eql({
            fields: { testName: 'testValue', testName2: 123 },
            target: '',
          });
        }
      });

      it('should create policy with advanced monitoring options', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies?sys_monitoring=true`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'advanced monitoring test',
            namespace: 'default',
            monitoring_pprof_enabled: true,
            monitoring_http: {
              host: 'localhost',
              port: 6791,
              enabled: true,
            },
            monitoring_diagnostics: {
              limit: {
                interval: '1m',
                burst: 1,
              },
              uploader: {
                max_retries: 10,
                init_dur: '1s',
                max_dur: '10m',
              },
            },
          })
          .expect(200);

        const policyResponse = await supertest
          .get(`/api/fleet/agent_policies/${createdPolicy.id}`)
          .expect(200);
        expect(policyResponse.body.item.monitoring_pprof_enabled).to.eql(true);
        expect(policyResponse.body.item.monitoring_http).to.eql({
          host: 'localhost',
          port: 6791,
          enabled: true,
        });
        expect(policyResponse.body.item.monitoring_diagnostics).to.eql({
          limit: {
            interval: '1m',
            burst: 1,
          },
          uploader: {
            max_retries: 10,
            init_dur: '1s',
            max_dur: '10m',
          },
        });

        const fullPolicyResponse = await supertest
          .get(`/api/fleet/agent_policies/${createdPolicy.id}/full`)
          .expect(200);
        expect(fullPolicyResponse.body.item.agent.monitoring).to.eql({
          enabled: true,
          logs: false,
          metrics: false,
          traces: false,
          pprof: {
            enabled: true,
          },
          http: {
            enabled: true,
            host: 'localhost',
            port: 6791,
          },
          diagnostics: {
            limit: {
              interval: '1m',
              burst: 1,
            },
            uploader: {
              max_retries: 10,
              init_dur: '1s',
              max_dur: '10m',
            },
          },
        });
      });

      it('should return 400 if setting data output to non-local ES for agentless policy', async () => {
        const { body: outputResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'logstash-output',
            type: 'logstash',
            hosts: ['test.fr:443'],
            ssl: {
              certificate: 'CERTIFICATE',
              key: 'KEY',
              certificate_authorities: ['CA1', 'CA2'],
            },
          })
          .expect(200);

        const response = await supertest
          .post(`/api/fleet/agent_policies?sys_monitoring=false`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-agentless-policy',
            namespace: 'default',
            supports_agentless: true,
            data_output_id: outputResponse.item.id,
          })
          .expect(400);

        expect(response.body.message).to.eql(
          'Output of type "logstash" is not usable with policy "test-agentless-policy".'
        );
      });
    });

    describe('POST /api/fleet/agent_policies/{agentPolicyId}/copy', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/fleet/agents');
        await fleetAndAgents.setup();
        await createAgentPolicyWithPackagePolicy();
        createdPolicyIds.push(agentPolicyWithPPId!);
      });
      const createdPolicyIds: string[] = [];
      after(async () => {
        const deletedPromises = createdPolicyIds.map((agentPolicyId) =>
          supertest
            .post(`/api/fleet/agent_policies/delete`)
            .set('kbn-xsrf', 'xxxx')
            .send({ agentPolicyId })
            .expect(200)
        );
        await Promise.all(deletedPromises);
        await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
        if (systemPkgVersion) {
          await supertest.delete(`/api/fleet/epm/packages/system/${systemPkgVersion}`);
        }
        if (packagePoliciesToDeleteIds.length > 0) {
          await kibanaServer.savedObjects.bulkDelete({
            objects: packagePoliciesToDeleteIds.map((id) => ({
              id,
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            })),
          });
        }
      });
      let systemPkgVersion: string;
      const packagePoliciesToDeleteIds: string[] = [];
      const TEST_POLICY_ID = 'policy1';

      it('should work with valid values', async () => {
        const {
          body: { item },
        } = await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied policy',
            description: 'Test',
          })
          .expect(200);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, version, ...newPolicy } = item;

        expect(newPolicy).to.eql({
          name: 'Copied policy',
          status: 'active',
          description: 'Test',
          is_managed: false,
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          package_policies: [],
          is_protected: false,
          space_ids: ['default'],
          supports_agentless: false,
        });
      });

      it('should copy with simplified format', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agent_policies/${agentPolicyWithPPId}/copy?format=simplified`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy (copy)',
            description: '',
          })
          .expect(200);
        expect(body.item.package_policies[0].inputs).to.eql({
          single_input: { enabled: true, streams: {} },
        });
      });

      it('should copy inactivity timeout', async () => {
        const {
          body: { item: policyWithTimeout },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Inactivity test',
            namespace: 'default',
            is_managed: true,
            inactivity_timeout: 123,
          })
          .expect(200);

        const {
          body: { item: newPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies/${policyWithTimeout.id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Inactivity test copy',
            description: 'Test',
          })
          .expect(200);

        expect(newPolicy.inactivity_timeout).to.eql(123);
      });

      it('should copy tamper protection', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Tamper Protection test',
            description: '',
            namespace: 'default',
          })
          .expect(200);

        await supertest
          .post(`/api/fleet/epm/packages/endpoint/8.10.2`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            force: true,
          })
          .expect(200);

        // add endpoint package policy, which is required for tamper protection
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'endpoint-1',
            description: '',
            namespace: 'default',
            policy_id: originalPolicy.id,
            enabled: true,
            inputs: [
              {
                enabled: true,
                streams: [],
                type: 'ENDPOINT_INTEGRATION_CONFIG',
                config: {
                  _config: {
                    value: {
                      type: 'endpoint',
                      endpointConfig: {
                        preset: 'EDRComplete',
                      },
                    },
                  },
                },
              },
            ],
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '8.10.2',
            },
          })
          .expect(200);

        packagePoliciesToDeleteIds.push('endpoint-1');

        // switch is protected to true
        const {
          body: { item: policyWithTamperProtection },
        } = await supertest
          .put(`/api/fleet/agent_policies/${originalPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Tamper Protection test',
            is_managed: false,
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
            is_protected: true,
          })
          .expect(200);

        createdPolicyIds.push(policyWithTamperProtection.id);

        // test copy
        const {
          body: { item: newPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies/${policyWithTamperProtection.id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Tamper Protection test copy',
            description: 'Test',
          })
          .expect(200);

        expect(newPolicy.is_protected).to.eql(true);
        expect(newPolicy.revision).to.eql(2);
      });

      it('should increment package policy copy names', async () => {
        async function getSystemPackagePolicyCopyVersion(policyId: string) {
          const {
            body: {
              item: { package_policies: packagePolicies },
            },
          } = await supertest.get(`/api/fleet/agent_policies/${policyId}`).expect(200);

          const matches = packagePolicies[0]?.name.match(/^(.*)\s\(copy\s?([0-9]*)\)$/);

          if (matches) {
            return parseInt(matches[2], 10) || 1;
          }
          return 0;
        }

        const policyId = 'package-policy-test-';
        packagePoliciesToDeleteIds.push(policyId);
        const getPkRes = await getPackage('system');
        systemPkgVersion = getPkRes.body.item.version;
        // we must first force install the system package to override package verification error on policy create
        const installPromise = await epmInstall('system', `${systemPkgVersion}`);

        await Promise.all([
          installPromise,
          kibanaServer.savedObjects.create({
            id: policyId,
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            overwrite: true,
            attributes: {
              name: `system-1`,
              package: {
                name: 'system',
              },
              latest_revision: true,
            },
          }),
        ]);

        const {
          body: {
            item: { id: originalPolicyId },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .query({
            sys_monitoring: true,
          })
          .send({
            name: 'original policy',
            namespace: 'default',
          })
          .expect(200);
        expect(await getSystemPackagePolicyCopyVersion(originalPolicyId)).to.be(0);

        const {
          body: {
            item: { id: copy1Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${originalPolicyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 1',
            description: 'Test',
          })
          .expect(200);
        expect(await getSystemPackagePolicyCopyVersion(copy1Id)).to.be(1);

        const {
          body: {
            item: { id: copy2Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${originalPolicyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 2',
            description: 'Test',
          })
          .expect(200);
        expect(await getSystemPackagePolicyCopyVersion(copy2Id)).to.be(2);

        // Copy a copy
        const {
          body: {
            item: { id: copy3Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${copy2Id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 3',
            description: 'Test',
          })
          .expect(200);
        expect(await getSystemPackagePolicyCopyVersion(copy3Id)).to.be(3);
      });

      it('should work with package policy with space in name', async () => {
        const policyId = 'package-policy-test-1';
        packagePoliciesToDeleteIds.push(policyId);
        const getPkRes = await getPackage('system');
        systemPkgVersion = getPkRes.body.item.version;
        // we must first force install the system package to override package verification error on policy create
        const installPromise = await epmInstall('system', `${systemPkgVersion}`);

        await Promise.all([
          installPromise,
          kibanaServer.savedObjects.create({
            id: policyId,
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            overwrite: true,
            attributes: {
              name: `system-1`,
              package: {
                name: 'system',
              },
              latest_revision: true,
            },
          }),
        ]);

        const {
          body: {
            item: { id: originalPolicyId },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .query({
            sys_monitoring: false,
          })
          .send({
            name: 'original policy with package policy with space in name',
            namespace: 'default',
          })
          .expect(200);

        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Filetest with space in name',
            description: '',
            namespace: 'default',
            policy_id: originalPolicyId,
            enabled: true,
            inputs: [],
            package: {
              name: 'filetest',
              title: 'For File Tests',
              version: '0.1.0',
            },
          })
          .expect(200);

        const {
          body: {
            item: { id: copy1Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${originalPolicyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 123',
            description: 'Test',
          })
          .expect(200);

        const {
          body: {
            item: { package_policies: packagePolicies },
          },
        } = await supertest.get(`/api/fleet/agent_policies/${copy1Id}`).expect(200);

        expect(packagePolicies[0].name).to.eql('Filetest with space in name (copy)');
      });

      it('should return a 404 with invalid source policy', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/INVALID_POLICY_ID/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied policy',
            description: '',
          })
          .expect(404);
      });

      it('should return a 400 with invalid payload', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({})
          .expect(400);
      });

      it('should return a 400 with invalid name', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: '',
          })
          .expect(400);
      });

      it('should return a 409 if policy already exists with name given', async () => {
        const {
          body: { item },
        } = await supertest.get(`/api/fleet/agent_policies/${TEST_POLICY_ID}`).expect(200);

        await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: item.name,
          })
          .expect(409);
      });

      it('should copy global data tags', async () => {
        const {
          body: { item: policyWithGlobalDataTags },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Global Data Tag Test',
            namespace: 'default',
            global_data_tags: [{ name: 'testName', value: 'testValue' }],
          })
          .expect(200);

        const {
          body: { item: newPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies/${policyWithGlobalDataTags.id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Global Data Tag Test Copy',
            description: 'Test',
          })
          .expect(200);

        expect(newPolicy.global_data_tags).to.eql([{ name: 'testName', value: 'testValue' }]);
      });

      it('should copy advanced monitoring options', async () => {
        const {
          body: { item: policyWithAdvancedMonitoring },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'advanced monitoring test',
            namespace: 'default',
            monitoring_pprof_enabled: true,
            monitoring_http: {
              host: 'localhost',
              port: 6791,
              enabled: true,
            },
            monitoring_diagnostics: {
              limit: {
                interval: '1m',
                burst: 1,
              },
              uploader: {
                max_retries: 10,
                init_dur: '1s',
                max_dur: '10m',
              },
            },
          })
          .expect(200);

        const {
          body: { item: newPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies/${policyWithAdvancedMonitoring.id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'advanced monitoring test copy',
            description: 'Test',
          })
          .expect(200);

        expect(newPolicy.monitoring_pprof_enabled).to.eql(true);
        expect(newPolicy.monitoring_http).to.eql({
          host: 'localhost',
          port: 6791,
          enabled: true,
        });
        expect(newPolicy.monitoring_diagnostics).to.eql({
          limit: {
            interval: '1m',
            burst: 1,
          },
          uploader: {
            max_retries: 10,
            init_dur: '1s',
            max_dur: '10m',
          },
        });
      });
    });

    describe('PUT /api/fleet/agent_policies/{agentPolicyId}', () => {
      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();
        await createAgentPolicyWithPackagePolicy();
        createdPolicyIds.push(agentPolicyWithPPId!);
      });
      const createdPolicyIds: string[] = [];
      after(async () => {
        const deletedPromises = createdPolicyIds.map((agentPolicyId) =>
          supertest
            .post(`/api/fleet/agent_policies/delete`)
            .set('kbn-xsrf', 'xxxx')
            .send({ agentPolicyId })
            .expect(200)
        );
        await Promise.all(deletedPromises);
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });
      let agentPolicyId: undefined | string;
      it('should work with valid values', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Initial name',
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Updated name',
            description: 'Updated description',
            namespace: 'default',
            is_protected: false,
          })
          .expect(200);
        createdPolicyIds.push(updatedPolicy.id);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, version, ...newPolicy } = updatedPolicy;

        expect(newPolicy).to.eql({
          status: 'active',
          name: 'Updated name',
          description: 'Updated description',
          namespace: 'default',
          is_managed: false,
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          inactivity_timeout: 1209600,
          package_policies: [],
          is_protected: false,
          space_ids: ['default'],
        });
      });

      it('should update with simplified format', async () => {
        const { body } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyWithPPId}?format=simplified`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy updated',
            namespace: 'default',
          })
          .expect(200);
        expect(body.item.package_policies[0].inputs).to.eql({
          single_input: { enabled: true, streams: {} },
        });
      });

      it('should support empty space_ids', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Initial name 2',
            space_ids: [],
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Updated name 2',
            space_ids: [],
            description: 'Updated description',
            namespace: 'default',
            is_protected: false,
          })
          .expect(200);
        createdPolicyIds.push(updatedPolicy.id);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, version, ...newPolicy } = updatedPolicy;

        expect(newPolicy).to.eql({
          status: 'active',
          name: 'Updated name 2',
          description: 'Updated description',
          namespace: 'default',
          is_managed: false,
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          inactivity_timeout: 1209600,
          package_policies: [],
          is_protected: false,
          space_ids: ['default'],
        });
      });

      it('should return a 409 if policy already exists with name given', async () => {
        const sharedBody = {
          name: 'Initial name',
          description: 'Initial description',
          namespace: 'default',
        };

        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(200);

        const { body } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(409);

        expect(body.message).to.match(/already exists?/);

        // same name, different namespace
        sharedBody.namespace = 'different';
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(409);

        expect(body.message).to.match(/already exists?/);
      });

      it('sets given is_managed value', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST2',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);

        const getRes = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        const json = getRes.body;
        expect(json.item.is_managed).to.equal(true);

        const {
          body: { item: createdPolicy2 },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST2',
            namespace: 'default',
            is_managed: false,
            force: true,
          })
          .expect(200);

        const {
          body: { item: policy2 },
        } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy2.id}`);
        expect(policy2.is_managed).to.equal(false);
      });

      it('should return a 400 if trying to update a managed policy', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Managed policy ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);

        const { body } = await supertest
          .put(`/api/fleet/agent_policies/${originalPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Updated name ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(400);

        expect(body.message).to.equal(
          'Cannot update name in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.'
        );
      });

      it('should return a 200 if updating monitoring_enabled on a policy', async () => {
        const fetchPackageList = async () => {
          const response = await supertest
            .get('/api/fleet/epm/packages')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };

        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test_policy',
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);

        // uninstall the elastic_agent and verify that is installed after the policy update
        await supertest
          .delete(`/api/fleet/epm/packages/elastic_agent/1.3.3`)
          .set('kbn-xsrf', 'xxxx');

        const listResponse = await fetchPackageList();
        const installedPackages = listResponse.items.filter(
          (item: any) => item.status === 'installed' && item.name === 'elastic_agent'
        );
        expect(installedPackages.length).to.be(0);
        agentPolicyId = originalPolicy.id;
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test_policy_with_monitoring',
            description: 'Updated description',
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
            force: true,
          })
          .expect(200);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, version, ...newPolicy } = updatedPolicy;
        createdPolicyIds.push(updatedPolicy.id);

        expect(newPolicy).to.eql({
          status: 'active',
          name: 'Test_policy_with_monitoring',
          description: 'Updated description',
          namespace: 'default',
          is_managed: false,
          is_protected: false,
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          package_policies: [],
          monitoring_enabled: ['logs', 'metrics'],
          inactivity_timeout: 1209600,
          space_ids: ['default'],
        });

        const listResponseAfterUpdate = await fetchPackageList();

        const installedPackagesAfterUpdate = listResponseAfterUpdate.items
          .filter((item: any) => item.status === 'installed')
          .map((item: any) => item.name);
        expect(installedPackagesAfterUpdate).to.contain('elastic_agent');
      });

      it('should allow to set overrides', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        createdPolicyIds.push(agentPolicyId as string);
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: originalPolicy.name,
            description: originalPolicy.description,
            namespace: 'default',
            overrides: {
              agent: {
                logging: {
                  level: 'debug',
                },
              },
            },
          })
          .expect(200);

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, version, ...newPolicy } = updatedPolicy;

        expect(newPolicy).to.eql({
          status: 'active',
          name: originalPolicy.name,
          description: originalPolicy.description,
          namespace: 'default',
          is_managed: false,
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          inactivity_timeout: 1209600,
          package_policies: [],
          is_protected: false,
          space_ids: ['default'],
          overrides: {
            agent: {
              logging: {
                level: 'debug',
              },
            },
          },
        });
      });

      it('should not allow to set inputs inside overrides', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        createdPolicyIds.push(agentPolicyId as string);
        await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Updated description',
            namespace: 'default',
            overrides: {
              inputs: [],
            },
          })
          .expect(400);
      });

      it('should overwrite global data tags if provided with valid input', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies?sys_monitoring=true`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'default',
            global_data_tags: [
              { name: 'testName', value: 'testValue' },
              { name: 'testName2', value: 123 },
            ],
          })
          .expect(200);
        createdPolicyIds.push(originalPolicy.id as string);

        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${originalPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: originalPolicy.name,
            namespace: 'default',
            global_data_tags: [{ name: 'newTag', value: 'newValue' }],
          })
          .expect(200);

        expect(updatedPolicy.global_data_tags).to.eql([{ name: 'newTag', value: 'newValue' }]);
      });

      it('should allow to set required_versions', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        createdPolicyIds.push(agentPolicyId as string);
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: originalPolicy.name,
            description: originalPolicy.description,
            namespace: 'default',
            required_versions: [
              {
                version: '9.0.0',
                percentage: 10,
              },
            ],
          })
          .expect(200);

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, version, ...newPolicy } = updatedPolicy;

        expect(newPolicy).to.eql({
          status: 'active',
          name: originalPolicy.name,
          description: originalPolicy.description,
          namespace: 'default',
          is_managed: false,
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          inactivity_timeout: 1209600,
          package_policies: [],
          is_protected: false,
          space_ids: ['default'],
          required_versions: [
            {
              version: '9.0.0',
              percentage: 10,
            },
          ],
        });
      });

      it('should not allow to set invalid required_versions', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        createdPolicyIds.push(agentPolicyId as string);
        await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Updated description',
            namespace: 'default',
            required_versions: [
              {
                version: '9.0.0',
                percentage: 50,
              },
              {
                version: '9.1.0',
                percentage: 60,
              },
            ],
          })
          .expect(400);
      });

      it('should return 400 if updating data output to non-local ES for agentless policy', async () => {
        const { body: outputResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'logstash-output',
            type: 'logstash',
            hosts: ['test.fr:443'],
            ssl: {
              certificate: 'CERTIFICATE',
              key: 'KEY',
              certificate_authorities: ['CA1', 'CA2'],
            },
          })
          .expect(200);

        const agentPolicyResponse = await supertest
          .post(`/api/fleet/agent_policies?sys_monitoring=false`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-agentless-policy',
            namespace: 'default',
          })
          .expect(200);

        const agentPolicy = agentPolicyResponse.body.item;

        const response = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-agentless-policy',
            namespace: 'default',
            supports_agentless: true,
            data_output_id: outputResponse.item.id,
          })
          .expect(400);

        expect(response.body.message).to.eql(
          'Output of type "logstash" is not usable with policy "test-agentless-policy".'
        );
      });
    });

    describe('POST /api/fleet/agent_policies/delete', () => {
      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      });
      after(async () => {
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });
      let hostedPolicy: any | undefined;
      it('should prevent hosted policies being deleted', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Hosted policy',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);
        hostedPolicy = createdPolicy;
        const { body } = await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: hostedPolicy.id })
          .expect(400);

        expect(body.message).to.contain('Cannot delete hosted agent policy');
      });

      it('should allow regular policies being deleted', async () => {
        const {
          body: { item: regularPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${hostedPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Regular policy',
            namespace: 'default',
            is_managed: false,
            force: true,
          })
          .expect(200);

        const { body } = await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: regularPolicy.id });

        expect(body).to.eql({
          id: regularPolicy.id,
          name: 'Regular policy',
        });
      });

      it('should allow hosted policy delete with force flag', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Hosted policy',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);
        hostedPolicy = createdPolicy;
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: hostedPolicy.id, force: true })
          .expect(200);

        await supertest.get(`/api/fleet/agent_policies/${hostedPolicy.id}`).expect(404);
      });

      describe('Errors when trying to delete', () => {
        it('should prevent policies having agents from being deleted', async () => {
          const {
            body: { item: policyWithAgents },
          } = await supertest
            .post(`/api/fleet/agent_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: 'Policy with agents',
              namespace: 'default',
            })
            .expect(200);
          await generateAgent(providerContext, 'healhty', 'agent-healthy-1', policyWithAgents.id);
          const { body } = await supertest
            .post('/api/fleet/agent_policies/delete')
            .set('kbn-xsrf', 'xxx')
            .send({ agentPolicyId: policyWithAgents.id })
            .expect(400);

          expect(body.message).to.contain(
            'Cannot delete an agent policy that is assigned to any active or inactive agents'
          );
          await supertest
            .delete(`/api/fleet/agents/agent-healthy-1`)
            .set('kbn-xsrf', 'xx')
            .expect(200);
        });

        it('should prevent policies having inactive agents from being deleted', async () => {
          const {
            body: { item: policyWithInactiveAgents },
          } = await supertest
            .post(`/api/fleet/agent_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: 'Policy with inactive agents',
              namespace: 'default',
            })
            .expect(200);
          await generateAgent(
            providerContext,
            'inactive',
            'agent-inactive-1',
            policyWithInactiveAgents.id
          );

          // inactive agents are included in agent policy agents count
          const {
            body: {
              item: { agents: agentsCount },
            },
          } = await supertest
            .get(`/api/fleet/agent_policies/${policyWithInactiveAgents.id}`)
            .expect(200);
          expect(agentsCount).to.equal(1);

          const { body } = await supertest
            .post('/api/fleet/agent_policies/delete')
            .set('kbn-xsrf', 'xxx')
            .send({ agentPolicyId: policyWithInactiveAgents.id })
            .expect(400);

          expect(body.message).to.contain(
            'Cannot delete an agent policy that is assigned to any active or inactive agents'
          );
          await supertest
            .delete(`/api/fleet/agents/agent-inactive-1`)
            .set('kbn-xsrf', 'xx')
            .expect(200);
        });
      });
    });

    describe('POST /api/fleet/agent_policies/_bulk_get', () => {
      let policyId: string;
      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await fleetAndAgents.setup();
        await createAgentPolicyWithPackagePolicy();

        const getPkRes = await getPackage('system');
        // we must first force install the system package to override package verification error on policy create
        await epmInstall('system', `${getPkRes.body.item.version}`);

        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .query({
            sys_monitoring: true,
          })
          .send({
            name: 'Bulk GET test policy',
            namespace: 'default',
          })
          .expect(200);

        policyId = createdPolicy.id;
      });
      after(async () => {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: policyId });
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: agentPolicyWithPPId })
          .expect(200);
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      it('should allow to get valid ids', async () => {
        const {
          body: { items },
        } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId],
          })
          .expect(200);

        expect(items.length).equal(1);
      });

      it('should populate package_policies if called with ?full=true', async () => {
        const {
          body: { items },
        } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId],
            full: true,
          })
          .expect(200);

        expect(items.length).equal(1);
        expect(items[0].package_policies.length).equal(1);
        expect(items[0].package_policies[0]).to.have.property('package');
        expect(items[0].package_policies[0].package.name).equal('system');
        const {
          package_policies: packagePolicies,
          id,
          space_ids: spaceIds,
          updated_at: updatedAt,
          version: policyVersion,
          ...rest
        } = items[0];
        expectSnapshot({
          ...rest,
          package_policies: packagePolicies.map(
            ({
              inputs,
              id: ppId,
              policy_id: ppPolicyId,
              policy_ids: ppPolicyIds,
              created_at: ppcreatedAt,
              updated_at: ppupdatedAt,
              version,
              package: { version: pkgVersion, ...pkgRest },
              ...ppRest
            }: any) => ({
              ...ppRest,
              package: pkgRest,
            })
          ),
        }).toMatch();
      });

      it('should bulk get with simplified format', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get?format=simplified`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [agentPolicyWithPPId!],
            full: true,
          })
          .expect(200);
        expect(body.items[0].package_policies[0].inputs).to.eql({
          single_input: { enabled: true, streams: {} },
        });
      });

      it('should return a 404 with invalid ids', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId, 'i-am-not-a-valid-policy'],
          })
          .expect(404);
      });

      it('should allow to get valid ids if ids is a mixed of valid and invalid ids and ignoreMissing is provided', async () => {
        const {
          body: { items },
        } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId, 'i-am-not-a-valid-policy'],
            ignoreMissing: true,
          })
          .expect(200);

        expect(items.length).equal(1);
      });
    });

    describe('GET /api/fleet/agent_policies/{id}/auto_upgrade_agents_status', () => {
      it('should get auto upgrade agents status', async () => {
        const {
          body: { item: policyWithAgents },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Policy with agents 2',
            namespace: 'default',
          })
          .expect(200);
        await generateAgent(providerContext, 'healhty', 'agent-1', policyWithAgents.id, '8.16.1');
        await generateAgent(providerContext, 'healhty', 'agent-2', policyWithAgents.id, '8.16.1', {
          state: 'UPG_FAILED',
          target_version: '8.16.3',
        });
        await generateAgent(
          providerContext,
          'uninstalled',
          'agent-3',
          policyWithAgents.id,
          '8.16.1'
        );
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${policyWithAgents.id}/auto_upgrade_agents_status`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body).to.eql({
          currentVersions: [
            {
              agents: 2,
              failedUpgradeAgents: 0,
              version: '8.16.1',
            },
            {
              agents: 0,
              failedUpgradeAgents: 1,
              version: '8.16.3',
            },
          ],
          totalAgents: 2,
        });

        await supertest.delete(`/api/fleet/agents/agent-1`).set('kbn-xsrf', 'xx').expect(200);
        await supertest.delete(`/api/fleet/agents/agent-2`).set('kbn-xsrf', 'xx').expect(200);
      });
    });

    describe('fleet server policies validate output', () => {
      let esOutputId: string;
      let logstashOutputId: string;
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        const { body: esApiResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Elastic output',
            type: 'elasticsearch',
            hosts: ['http://localhost'],
          })
          .expect(200);
        esOutputId = esApiResponse.item.id;

        const { body: logstashApiResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default logstash',
            type: 'logstash',
            hosts: ['logstash'],
            ssl: { certificate: 'CERTIFICATE', key: 'KEY', certificate_authorities: [] },
            is_default: true,
            is_default_monitoring: true,
          })
          .expect(200);

        logstashOutputId = logstashApiResponse.item.id;
      });

      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      async function assertPolicyDoNotExists(id: string) {
        await supertest.get(`/api/fleet/agent_policies/${id}`).expect(404);
      }

      it('should not allow to create a fleet server policies if default output is not an ES output', async () => {
        const policyId = `fleet-server-${Date.now()}`;
        const { statusCode } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'kibana')
          .send({
            id: policyId,
            name: 'Fleet Server policy ' + Date.now(),
            namespace: 'default',
            has_fleet_server: true,
          });

        expect(statusCode).to.eql(400);

        await assertPolicyDoNotExists(policyId);
      });

      it('should not allow to create a fleet server policies if provided output is not an ES output', async () => {
        const policyId = `fleet-server-${Date.now()}`;
        const { statusCode, body } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'kibana')
          .send({
            id: policyId,
            name: 'Fleet Server policy ' + Date.now(),
            namespace: 'default',
            has_fleet_server: true,
            data_output_id: logstashOutputId,
          });

        expect(statusCode).to.eql(400);
        expect(body.message).to.match(/Output of type "logstash" is not usable with policy/);

        await assertPolicyDoNotExists(policyId);
      });

      it('should allow to create a fleet server policies if provided output is an ES output', async () => {
        const policyId = `fleet-server-${Date.now()}`;
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'kibana')
          .send({
            id: policyId,
            name: 'Fleet Server policy ' + Date.now(),
            namespace: 'default',
            has_fleet_server: true,
            data_output_id: esOutputId,
          })
          .expect(200);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/213370
    describe.skip('POST /internal/fleet/agent_and_package_policies', () => {
      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should create agent and package policy successfully when not given ids', async () => {
        const requestBody = {
          name: 'Test Agent Policy',
          namespace: 'default',
          description: 'Test description',
          package_policies: [
            {
              name: 'Test Package Policy',
              namespace: 'default',
              policy_ids: [],
              enabled: true,
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: 'single_input',
                },
              ],
              package: {
                name: 'filetest',
                title: 'For File Tests',
                version: '0.1.0',
              },
            },
          ],
        };

        const {
          body: { item: createdPolicy },
        } = await supertest
          .post('/internal/fleet/agent_and_package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send(requestBody)
          .expect(200);

        expect(createdPolicy.name).to.eql('Test Agent Policy');
        expect(createdPolicy.package_policies[0].name).to.eql('Test Package Policy');
        expect(createdPolicy.package_policies[0].policy_ids).to.eql([createdPolicy.id]);
      });

      it('should create agent and package policy successfully when given ids', async () => {
        const requestBody = {
          id: 'test-agent-policy-with-id',
          name: 'Test Agent Policy',
          namespace: 'default',
          description: 'Test description',
          package_policies: [
            {
              id: 'test-package-policy-with-id',
              name: 'Test Package Policy',
              namespace: 'default',
              policy_ids: ['test-agent-policy-with-id'],
              enabled: true,
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: 'single_input',
                },
              ],
              package: {
                name: 'filetest',
                title: 'For File Tests',
                version: '0.1.0',
              },
            },
            {
              id: 'test-package-policy-with-id-2',
              name: 'Test Package Policy 2',
              namespace: 'default',
              policy_ids: ['test-agent-policy-with-id'],
              enabled: true,
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: 'single_input',
                },
              ],
              package: {
                name: 'filetest',
                title: 'For File Tests',
                version: '0.1.0',
              },
            },
          ],
        };

        const {
          body: { item: createdPolicy },
        } = await supertest
          .post('/internal/fleet/agent_and_package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send(requestBody)
          .expect(200);

        expect(createdPolicy.id).to.eql(requestBody.id);
        expect(createdPolicy.package_policies[0].id).to.eql(requestBody.package_policies[0].id);
        expect(createdPolicy.package_policies[0].policy_ids).to.eql(
          requestBody.package_policies[0].policy_ids
        );
        expect(createdPolicy.package_policies[1].id).to.eql(requestBody.package_policies[1].id);
        expect(createdPolicy.package_policies[1].policy_ids).to.eql(
          requestBody.package_policies[1].policy_ids
        );
      });

      it('should create agent and package policy with consistent ids when given a mix', async () => {
        const requestBody = {
          name: 'Test Agent Policy',
          namespace: 'default',
          description: 'Test description',
          package_policies: [
            {
              id: 'test-package-policy-mixed-id',
              name: 'Test Package Policy',
              namespace: 'default',
              policy_id: 'some-invalid-id',
              enabled: true,
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: 'single_input',
                },
              ],
              package: {
                name: 'filetest',
                title: 'For File Tests',
                version: '0.1.0',
              },
            },
          ],
        };

        const {
          body: { item: createdPolicy },
        } = await supertest
          .post('/internal/fleet/agent_and_package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send(requestBody)
          .expect(200);

        expect(createdPolicy.name).to.eql('Test Agent Policy');
        expect(createdPolicy.package_policies[0].id).to.eql(requestBody.package_policies[0].id);
        expect(createdPolicy.package_policies[0].policy_id).to.be(createdPolicy.id);
        expect(createdPolicy.package_policies[0].policy_ids).to.eql([createdPolicy.id]);
      });

      it('should delete created agent policy and package policies if create package policy fails', async () => {
        const requestBody = {
          id: 'test-agent-policy-for-rollback',
          name: 'Test Agent Policy',
          namespace: 'default',
          description: 'Test description',
          package_policies: [
            {
              id: 'test-package-policy-for-rollback-1',
              name: 'Test Package Policy',
              namespace: 'default',
              policy_ids: ['test-agent-policy-for-rollback'],
              enabled: true,
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: 'single_input',
                },
              ],
              package: {
                name: 'filetest',
                title: 'For File Tests',
                version: '0.1.0',
              },
            },
            {
              id: 'test-package-policy-for-rollback-2',
              name: 'Test Package Policy 2',
              namespace: 'default',
              policy_ids: ['test-agent-policy-for-rollback'],
              enabled: true,
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: 'single_input',
                },
              ],
              package: {
                name: 'filetest',
                title: 'For File Tests',
                version: '0.1.0',
              },
            },
            {
              id: 'test-package-policy-for-rollback-3',
              name: 'Test Package Policy 3',
              namespace: 'default',
              policy_ids: ['test-agent-policy-for-rollback'],
              enabled: true,
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: 'single_input',
                },
              ],
              package: {
                name: 'filetest',
                title: 'For File Tests',
                version: '0.1.0-badversion', // to trigger error
              },
            },
          ],
        };

        const response = await supertest
          .post('/internal/fleet/agent_and_package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send(requestBody);

        expect(response.status).to.not.be(200);
        expect(response.body.error).to.not.be.empty();

        // Verify that the valid created policies were deleted
        await supertest
          .get(`/api/fleet/package_policies/${requestBody.package_policies[0].id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(404);
        await supertest
          .get(`/api/fleet/package_policies/${requestBody.package_policies[1].id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(404);
        await supertest
          .get(`/api/fleet/agent_policies/${requestBody.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(404);
      });
    });
  });
}
