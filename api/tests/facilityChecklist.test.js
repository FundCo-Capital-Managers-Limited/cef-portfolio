const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-risk', auth_user_id: 'auth-risk', email: 'risk@cef.example', role: 'risk', assetco_id: null },
    { id: 'user-admin-eml', auth_user_id: 'auth-admin-eml', email: 'admin@eml.example.com', role: 'assetco_admin', assetco_id: 'EML' },
    { id: 'user-admin-grosolar', auth_user_id: 'auth-admin-grosolar', email: 'admin@grosolar.example.com', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
  ],
  assetcos: [
    { id: 'EML', name: 'EML', hmac_secret: 'secret', is_active: true },
    { id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret2', is_active: true },
  ],
  cef_facilities: [
    { id: 'facility-eml-1', assetco_id: 'EML', facility_reference: 'CEF-FA-EML-001', principal_amount_ngn: 20000000, total_repaid_ngn: 0, outstanding_balance_ngn: 20000000, facility_status: 'ACTIVE' },
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

describe('Facility onboarding/gap-diagnostic checklist', () => {
  it('rejects an invalid business model', async () => {
    const res = await as('auth-mgmt')(request(app).post('/api/facilities/facility-eml-1/checklist/apply').send({ businessModel: 'BOGUS' }));
    expect(res.status).toBe(400);
  });

  it('the facility\'s own AssetCo admin can apply the default checklist for a business model', async () => {
    const res = await as('auth-admin-eml')(request(app).post('/api/facilities/facility-eml-1/checklist/apply').send({ businessModel: 'C&I' }));
    expect(res.status).toBe(201);
    expect(res.body.items.length).toBeGreaterThan(5);
    expect(res.body.items.every((i) => i.status === 'PENDING')).toBe(true);
    expect(res.body.items.some((i) => i.label.includes('Off-taker'))).toBe(true);
  });

  it('applying the same business model again does not duplicate items', async () => {
    const res = await as('auth-mgmt')(request(app).post('/api/facilities/facility-eml-1/checklist/apply').send({ businessModel: 'C&I' }));
    expect(res.status).toBe(201);

    const listRes = await as('auth-exec')(request(app).get('/api/facilities/facility-eml-1/checklist'));
    const labels = listRes.body.items.map((i) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('a different AssetCo\'s admin cannot apply or view this facility\'s checklist', async () => {
    const applyRes = await as('auth-admin-grosolar')(request(app).post('/api/facilities/facility-eml-1/checklist/apply').send({ businessModel: 'C2C' }));
    expect(applyRes.status).toBe(403);

    const listRes = await as('auth-admin-grosolar')(request(app).get('/api/facilities/facility-eml-1/checklist'));
    expect(listRes.status).toBe(403);
  });

  it('adds an ad hoc item and marks it DONE, recording who completed it', async () => {
    const addRes = await as('auth-risk')(
      request(app).post('/api/facilities/facility-eml-1/checklist').send({ label: 'Site visit conducted by Risk' })
    );
    expect(addRes.status).toBe(201);
    const itemId = addRes.body.item.id;

    const updateRes = await as('auth-risk')(request(app).patch(`/api/facilities/checklist/${itemId}`).send({ status: 'DONE' }));
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.status).toBe('DONE');
    expect(updateRes.body.item.completed_by_email).toBe('risk@cef.example');
    expect(updateRes.body.item.completed_at).toBeTruthy();
  });

  it('rejects an ad hoc item with no label', async () => {
    const res = await as('auth-mgmt')(request(app).post('/api/facilities/facility-eml-1/checklist').send({}));
    expect(res.status).toBe(400);
  });
});
