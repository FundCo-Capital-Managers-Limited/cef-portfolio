const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
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

describe('InfraCredit/DREEF endpoints', () => {
  it('GET returns null relationship when none exists yet', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/assetcos/GROSOLAR/infracredit'));
    expect(res.status).toBe(200);
    expect(res.body.relationship).toBeNull();
  });

  it('executive cannot create a DREEF relationship', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(
      request(app).post('/api/assetcos/GROSOLAR/infracredit').send({ dreefStage: 'MANDATED' })
    );
    expect(res.status).toBe(403);
  });

  it('rejects an invalid dreefStage', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/assetcos/GROSOLAR/infracredit').send({ dreefStage: 'NOT_A_STAGE' })
    );
    expect(res.status).toBe(400);
  });

  it('management can create a DREEF relationship, and a second POST is rejected', async () => {
    const withAuth = as('auth-mgmt');
    const created = await withAuth(
      request(app).post('/api/assetcos/GROSOLAR/infracredit').send({
        dreefStage: 'MANDATED',
        infracreditReference: 'IC-2026-001',
        guaranteeType: 'CREDIT_GUARANTEE',
        guaranteeAmountNgn: 500000000,
      })
    );
    expect(created.status).toBe(201);
    expect(created.body.relationship.dreef_stage).toBe('MANDATED');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'INFRACREDIT_RELATIONSHIP_CREATED');
    expect(auditEntry.entity_id).toBe('GROSOLAR');

    const duplicate = await withAuth(
      request(app).post('/api/assetcos/GROSOLAR/infracredit').send({ dreefStage: 'MANDATED' })
    );
    expect(duplicate.status).toBe(409);
  });

  it('management can update an existing DREEF relationship', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).put('/api/assetcos/GROSOLAR/infracredit').send({ dreefStage: 'UNDER_GUARANTEE' })
    );
    expect(res.status).toBe(200);
    expect(res.body.relationship.dreef_stage).toBe('UNDER_GUARANTEE');
  });

  it('PUT on a non-existent relationship 404s', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).put('/api/assetcos/EML/infracredit').send({ dreefStage: 'MANDATED' })
    );
    expect(res.status).toBe(404);
  });
});
