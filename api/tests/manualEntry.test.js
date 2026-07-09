const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
    { id: 'user-groadmin', auth_user_id: 'auth-groadmin', email: 'admin@grosolar.example', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true, integration_type: 'MANUAL' }],
});

jest.mock('../src/config/supabase', () => mockSupabase);

const mockVerifyAccessToken = jest.fn();
jest.mock('../src/services/jwtVerifier', () => ({
  verifyAccessToken: (...args) => mockVerifyAccessToken(...args),
}));

const request = require('supertest');
const app = require('../src/app');

function as(authUid) {
  mockVerifyAccessToken.mockResolvedValue({ sub: authUid });
  return (req) => req.set('Authorization', 'Bearer token');
}

describe('Manual data entry endpoints', () => {
  it('executive cannot submit manual data', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(
      request(app).post('/api/manual/customers').send({ assetCoId: 'GROSOLAR', customerName: 'Ada Lovelace' })
    );
    expect(res.status).toBe(403);
  });

  it("assetco_admin can create a customer for their own AssetCo, defaulting to PIPELINE", async () => {
    const withAuth = as('auth-groadmin');
    const res = await withAuth(
      request(app).post('/api/manual/customers').send({ assetCoId: 'GROSOLAR', customerName: 'Ada Lovelace', segment: 'RESIDENTIAL', state: 'Lagos' })
    );
    expect(res.status).toBe(201);
    expect(res.body.customer.name).toBe('Ada Lovelace');
    expect(res.body.customer.status).toBe('PIPELINE');
    expect(res.body.customer.data_source).toBe('MANUAL');

    const event = mockSupabase._store.events.find((e) => e.event_type === 'customer.created');
    expect(event.source).toBe('MANUAL_ENTRY');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'MANUAL_CUSTOMER_CREATED');
    expect(auditEntry).toBeTruthy();
  });

  it('allows an explicit status override for pre-existing active customers', async () => {
    const withAuth = as('auth-groadmin');
    const res = await withAuth(
      request(app).post('/api/manual/customers').send({ assetCoId: 'GROSOLAR', customerName: 'Existing Customer', status: 'ACTIVE' })
    );
    expect(res.status).toBe(201);
    expect(res.body.customer.status).toBe('ACTIVE');
  });

  it('management can create an asset (deployed) for a customer', async () => {
    const withAuth = as('auth-mgmt');
    const customerRes = await withAuth(
      request(app).post('/api/manual/customers').send({ assetCoId: 'GROSOLAR', customerName: 'Asset Owner' })
    );
    const customerId = customerRes.body.customer.id;

    const res = await withAuth(
      request(app).post('/api/manual/assets').send({
        assetCoId: 'GROSOLAR',
        customerId,
        oemModel: 'Itel Solar 5kVA',
        oemManufacturer: 'Itel',
        remoteControlSupported: false,
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.asset.status).toBe('deployed');
    expect(res.body.asset.customer_id).toBe(customerId);
    expect(res.body.asset.data_source).toBe('MANUAL');
  });

  it('management can record a manual payment, tagged with data_source and entered_by', async () => {
    const withAuth = as('auth-mgmt');
    const customerRes = await withAuth(
      request(app).post('/api/manual/customers').send({ assetCoId: 'GROSOLAR', customerName: 'Payer' })
    );
    const assetRes = await withAuth(
      request(app).post('/api/manual/assets').send({ assetCoId: 'GROSOLAR', customerId: customerRes.body.customer.id })
    );
    const assetId = assetRes.body.asset.id;

    const res = await withAuth(
      request(app).post('/api/manual/payments').send({
        assetCoId: 'GROSOLAR',
        assetId,
        customerId: customerRes.body.customer.id,
        amount: 50000,
        status: 'RECEIVED',
        period: '2026-06',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe('received');
    expect(res.body.payment.data_source).toBe('MANUAL');
    expect(res.body.payment.entered_by).toBe('user-mgmt');

    const cashflow = mockSupabase._store.cashflow_state.find((c) => c.asset_id === assetId);
    expect(cashflow.total_collected).toBe(50000);
  });

  it('rejects an invalid manual payment status', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/manual/payments').send({
        assetCoId: 'GROSOLAR',
        assetId: 'GS-1',
        amount: 1000,
        status: 'NOT_A_STATUS',
        period: '2026-06',
      })
    );
    expect(res.status).toBe(400);
  });

  it('management can report a fault manually, triggering the same alert pipeline', async () => {
    const withAuth = as('auth-mgmt');
    const customerRes = await withAuth(
      request(app).post('/api/manual/customers').send({ assetCoId: 'GROSOLAR', customerName: 'Fault Owner' })
    );
    const assetRes = await withAuth(
      request(app).post('/api/manual/assets').send({ assetCoId: 'GROSOLAR', customerId: customerRes.body.customer.id })
    );
    const assetId = assetRes.body.asset.id;

    const res = await withAuth(
      request(app).post('/api/manual/faults').send({
        assetCoId: 'GROSOLAR',
        assetId,
        faultDescription: 'Inverter offline',
        severity: 'High',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.fault.status).toBe('open');

    const alert = mockSupabase._store.alerts.find((a) => a.alert_type === 'asset.fault.detected' && a.asset_id === assetId);
    expect(alert).toBeTruthy();
  });
});
