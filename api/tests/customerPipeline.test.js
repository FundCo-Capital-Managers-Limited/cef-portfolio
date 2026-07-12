const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
    { id: 'user-groadmin', auth_user_id: 'auth-groadmin', email: 'admin@grosolar.example', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
  customers: [
    { id: 'CUS-0001', assetco_id: 'GROSOLAR', status: 'PIPELINE', expected_monthly_payment_ngn: 50000, location_state: 'Lagos', contract_signed_date: '2026-06-01' },
    { id: 'CUS-0002', assetco_id: 'GROSOLAR', status: 'ASSET_ORDERED', expected_monthly_payment_ngn: 75000, location_state: 'Ogun' },
    { id: 'CUS-0003', assetco_id: 'GROSOLAR', status: 'ACTIVE', expected_monthly_payment_ngn: 60000 },
    { id: 'CUS-0004', assetco_id: 'GROSOLAR', status: 'DEFAULTED' },
  ],
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

describe('Customer pipeline endpoints', () => {
  it('GET summary returns counts by status and pipeline monthly value', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/assetcos/GROSOLAR/customers/summary'));
    expect(res.status).toBe(200);
    expect(res.body.pipeline).toBe(1);
    expect(res.body.asset_ordered).toBe(1);
    expect(res.body.active).toBe(1);
    expect(res.body.defaulted).toBe(1);
    expect(res.body.total).toBe(4);
    // 50000 (PIPELINE) + 75000 (ASSET_ORDERED)
    expect(res.body.pipeline_monthly_value_ngn).toBe(125000);
  });

  it('GET pipeline returns only pre-deployment customers, ordered by expected installation date', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/assetcos/GROSOLAR/customers/pipeline'));
    expect(res.status).toBe(200);
    expect(res.body.customers.map((c) => c.id).sort()).toEqual(['CUS-0001', 'CUS-0002']);
  });

  it('GET pipeline filters by state', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/assetcos/GROSOLAR/customers/pipeline?state=Lagos'));
    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(1);
    expect(res.body.customers[0].id).toBe('CUS-0001');
  });

  it('executive cannot update a customer status', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).patch('/api/customers/CUS-0001/status').send({ status: 'ACTIVE' }));
    expect(res.status).toBe(403);
  });

  it("assetco_admin can update their own AssetCo's customer status, logged + audited", async () => {
    const withAuth = as('auth-groadmin');
    const res = await withAuth(
      request(app).patch('/api/customers/CUS-0002/status').send({ status: 'INSTALLATION_SCHEDULED', notes: 'Install booked' })
    );
    expect(res.status).toBe(200);
    expect(res.body.customer.status).toBe('INSTALLATION_SCHEDULED');

    const logEntry = mockSupabase._store.customer_stage_log.find((l) => l.customer_id === 'CUS-0002');
    expect(logEntry.from_status).toBe('ASSET_ORDERED');
    expect(logEntry.to_status).toBe('INSTALLATION_SCHEDULED');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'CUSTOMER_STATUS_CHANGED');
    expect(auditEntry.entity_id).toBe('CUS-0002');
  });

  it('rejects an invalid status', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).patch('/api/customers/CUS-0001/status').send({ status: 'NOT_A_STATUS' }));
    expect(res.status).toBe(400);
  });

  it('404s for an unknown customer', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).patch('/api/customers/CUS-9999/status').send({ status: 'ACTIVE' }));
    expect(res.status).toBe(404);
  });
});
