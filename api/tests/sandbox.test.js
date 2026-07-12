const crypto = require('crypto');
const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  assetcos: [{ id: 'DEMOSOLAR', name: 'DemoSolar', hmac_secret: 'demo-secret', is_active: true }],
  customers: [
    { id: 'CUS-SAMPLE-0001', assetco_id: 'DEMOSOLAR', name: 'Sample Customer' },
    { id: 'CUS-0001', assetco_id: 'DEMOSOLAR', name: 'Real Customer' },
  ],
  assets: [
    { id: 'AST-SAMPLE-0001', assetco_id: 'DEMOSOLAR', customer_id: 'CUS-SAMPLE-0001' },
    { id: 'GS-1001', assetco_id: 'DEMOSOLAR', customer_id: 'CUS-0001' },
  ],
  payments: [
    { id: 'p1', assetco_id: 'DEMOSOLAR', asset_id: 'AST-SAMPLE-0001', amount: 100 },
    { id: 'p2', assetco_id: 'DEMOSOLAR', asset_id: 'GS-1001', amount: 200 },
  ],
});

jest.mock('../src/config/supabase', () => mockSupabase);

process.env.SANDBOX_RESET_ENABLED = 'true';

const request = require('supertest');
const app = require('../src/app');

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('DELETE /api/v1/sandbox/reset', () => {
  it('wipes only SAMPLE-prefixed data for the authenticated AssetCo', async () => {
    const res = await request(app)
      .delete('/api/v1/sandbox/reset')
      .set('X-CEF-AssetCo-Id', 'DEMOSOLAR')
      .set('X-CEF-Signature', sign('', 'demo-secret'));

    expect(res.status).toBe(200);
    expect(mockSupabase._store.customers.map((c) => c.id)).toEqual(['CUS-0001']);
    expect(mockSupabase._store.assets.map((a) => a.id)).toEqual(['GS-1001']);
    expect(mockSupabase._store.payments.map((p) => p.id)).toEqual(['p2']);
  });

  it('rejects requests with an invalid signature', async () => {
    const res = await request(app)
      .delete('/api/v1/sandbox/reset')
      .set('X-CEF-AssetCo-Id', 'DEMOSOLAR')
      .set('X-CEF-Signature', 'wrong-signature-not-hex-of-anything00000000000000000000000000');

    expect(res.status).toBe(401);
  });

  it('is disabled by default when SANDBOX_RESET_ENABLED is not set, even outside production', async () => {
    let disabledApp;
    jest.isolateModules(() => {
      delete process.env.SANDBOX_RESET_ENABLED;
      disabledApp = require('../src/app');
    });

    const res = await request(disabledApp)
      .delete('/api/v1/sandbox/reset')
      .set('X-CEF-AssetCo-Id', 'DEMOSOLAR')
      .set('X-CEF-Signature', sign('', 'demo-secret'));

    expect(res.status).toBe(404);
    process.env.SANDBOX_RESET_ENABLED = 'true';
  });
});
