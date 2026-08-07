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

describe('Facility milestones (project-development facilities)', () => {
  it('the facility\'s own AssetCo admin can add a milestone, defaulting to PENDING', async () => {
    const res = await as('auth-admin-eml')(
      request(app).post('/api/facilities/facility-eml-1/milestones').send({
        title: 'Site survey complete',
        targetDate: '2026-09-01',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.milestone.status).toBe('PENDING');
    expect(res.body.milestone.assetco_id).toBe('EML');
  });

  it('a different AssetCo\'s admin cannot add a milestone to this facility', async () => {
    const res = await as('auth-admin-grosolar')(
      request(app).post('/api/facilities/facility-eml-1/milestones').send({ title: 'x' })
    );
    expect(res.status).toBe(403);
  });

  it('rejects a milestone with no title', async () => {
    const res = await as('auth-mgmt')(request(app).post('/api/facilities/facility-eml-1/milestones').send({}));
    expect(res.status).toBe(400);
  });

  it('any CEF-wide role can list milestones for a facility', async () => {
    const res = await as('auth-exec')(request(app).get('/api/facilities/facility-eml-1/milestones'));
    expect(res.status).toBe(200);
    expect(res.body.milestones.length).toBeGreaterThan(0);
  });

  it('marking a milestone COMPLETED without an explicit date defaults completed_date to today', async () => {
    const createRes = await as('auth-risk')(
      request(app).post('/api/facilities/facility-eml-1/milestones').send({ title: 'First disbursement tranche released' })
    );
    const milestoneId = createRes.body.milestone.id;

    const updateRes = await as('auth-risk')(
      request(app).patch(`/api/facilities/milestones/${milestoneId}`).send({ status: 'COMPLETED', evidenceUrl: 'https://fundco.sharepoint.com/eml-tranche-1' })
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.milestone.status).toBe('COMPLETED');
    expect(updateRes.body.milestone.completed_date).toBeTruthy();
    expect(updateRes.body.milestone.evidence_url).toBe('https://fundco.sharepoint.com/eml-tranche-1');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'FACILITY_MILESTONE_UPDATED');
    expect(auditEntry).toBeTruthy();
  });

  it('rejects an invalid status', async () => {
    const createRes = await as('auth-mgmt')(request(app).post('/api/facilities/facility-eml-1/milestones').send({ title: 'x' }));
    const milestoneId = createRes.body.milestone.id;

    const res = await as('auth-mgmt')(request(app).patch(`/api/facilities/milestones/${milestoneId}`).send({ status: 'BOGUS' }));
    expect(res.status).toBe(400);
  });
});
