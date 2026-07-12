const crypto = require('crypto');
const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const SECRET = 'test-secret';
const mockSupabase = createFakeSupabase({
  assetcos: [{ id: 'DEMOSOLAR', hmac_secret: SECRET, is_active: true }],
});

jest.mock('../src/config/supabase', () => mockSupabase);

const request = require('supertest');
const app = require('../src/app');

function sign(bodyString) {
  return crypto.createHmac('sha256', SECRET).update(bodyString).digest('hex');
}

async function sendEvent(payload) {
  const bodyString = JSON.stringify(payload);
  const res = await request(app)
    .post('/api/v1/events')
    .set('Content-Type', 'application/json')
    .set('X-CEF-AssetCo-Id', 'DEMOSOLAR')
    .set('X-CEF-Signature', sign(bodyString))
    .send(bodyString);
  expect(res.status).toBe(200);
  return res.body;
}

const ASSET_ID = 'GS-2001';
const CUSTOMER_ID = 'CUS-9001';

describe('Asset Registry handlers', () => {
  it('processes customer.created, asset.created -> deployed -> decommissioned, preserving customer_id', async () => {
    await sendEvent({
      eventType: 'customer.created',
      assetCoId: 'DEMOSOLAR',
      customerId: CUSTOMER_ID,
      timestamp: '2026-01-01T00:00:00Z',
      metadata: { name: 'Test Customer' },
    });

    let customer = mockSupabase._store.customers.find((c) => c.id === CUSTOMER_ID);
    expect(customer.name).toBe('Test Customer');
    expect(customer.sync_status).toBe('SYNCED');

    await sendEvent({
      eventType: 'asset.created',
      assetCoId: 'DEMOSOLAR',
      assetId: ASSET_ID,
      customerId: CUSTOMER_ID,
      timestamp: '2026-01-02T00:00:00Z',
    });

    let asset = mockSupabase._store.assets.find((a) => a.id === ASSET_ID);
    expect(asset.status).toBe('created');
    expect(asset.customer_id).toBe(CUSTOMER_ID);

    // asset.deployed omits customerId — should not null out the existing one
    await sendEvent({
      eventType: 'asset.deployed',
      assetCoId: 'DEMOSOLAR',
      assetId: ASSET_ID,
      timestamp: '2026-01-10T00:00:00Z',
    });

    asset = mockSupabase._store.assets.find((a) => a.id === ASSET_ID);
    expect(asset.status).toBe('deployed');
    expect(asset.customer_id).toBe(CUSTOMER_ID);
    expect(asset.deployed_at).toBe('2026-01-10T00:00:00Z');

    await sendEvent({
      eventType: 'asset.decommissioned',
      assetCoId: 'DEMOSOLAR',
      assetId: ASSET_ID,
      timestamp: '2026-02-01T00:00:00Z',
    });

    asset = mockSupabase._store.assets.find((a) => a.id === ASSET_ID);
    expect(asset.status).toBe('decommissioned');
    expect(asset.customer_id).toBe(CUSTOMER_ID);
    // deployed_at from the earlier event should still be intact
    expect(asset.deployed_at).toBe('2026-01-10T00:00:00Z');
  });

  it('persists OEM/remote-control fields on asset.created and preserves them when asset.deployed omits them', async () => {
    const assetId = 'GS-3001';

    await sendEvent({
      eventType: 'asset.created',
      assetCoId: 'DEMOSOLAR',
      assetId,
      timestamp: '2026-04-01T00:00:00Z',
      oemModel: 'TankVolt EV Bike',
      oemManufacturer: 'TankVolt',
      oemRemoteControlApiAvailable: true,
      remoteControlSupported: true,
    });

    let asset = mockSupabase._store.assets.find((a) => a.id === assetId);
    expect(asset.oem_model).toBe('TankVolt EV Bike');
    expect(asset.oem_manufacturer).toBe('TankVolt');
    expect(asset.oem_remote_control_api_available).toBe(true);
    expect(asset.remote_control_supported).toBe(true);

    // asset.deployed omits all OEM fields — must not wipe what asset.created set
    await sendEvent({
      eventType: 'asset.deployed',
      assetCoId: 'DEMOSOLAR',
      assetId,
      timestamp: '2026-04-05T00:00:00Z',
    });

    asset = mockSupabase._store.assets.find((a) => a.id === assetId);
    expect(asset.oem_model).toBe('TankVolt EV Bike');
    expect(asset.remote_control_supported).toBe(true);
  });

  it('defaults OEM/remote-control fields to false/null when never provided', async () => {
    const assetId = 'GS-3002';

    await sendEvent({
      eventType: 'asset.created',
      assetCoId: 'DEMOSOLAR',
      assetId,
      timestamp: '2026-04-01T00:00:00Z',
    });

    const asset = mockSupabase._store.assets.find((a) => a.id === assetId);
    expect(asset.oem_model).toBeNull();
    expect(asset.remote_control_supported).toBe(false);
    expect(asset.oem_remote_control_api_available).toBe(false);
  });

  it('processes sync.heartbeat and tracks last_heartbeat_at per AssetCo', async () => {
    await sendEvent({
      eventType: 'sync.heartbeat',
      assetCoId: 'DEMOSOLAR',
      timestamp: '2026-03-01T12:00:00Z',
    });

    const sync = mockSupabase._store.sync_state.find((s) => s.assetco_id === 'DEMOSOLAR');
    expect(sync.last_heartbeat_at).toBe('2026-03-01T12:00:00Z');
  });
});
