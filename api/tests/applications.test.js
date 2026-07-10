const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-ops', auth_user_id: 'auth-ops', email: 'ops@cef.example', role: 'ops', assetco_id: null },
  ],
  assetcos: [],
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

describe('AssetCo onboarding application endpoints', () => {
  it('accepts a public submission with no auth', async () => {
    const res = await request(app).post('/api/applications').send({
      companyName: 'NewCo Solar',
      primaryContactName: 'Jane Doe',
      primaryContactEmail: 'jane@newcosolar.example',
      sector: 'SOLAR',
    });
    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('PENDING');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'ASSETCO_APPLICATION_SUBMITTED');
    expect(auditEntry.entity_id).toBe(res.body.application.id);
  });

  it('rejects a submission missing required fields', async () => {
    const res = await request(app).post('/api/applications').send({ companyName: 'Incomplete Co' });
    expect(res.status).toBe(400);
  });

  it('blocks non-reviewer roles from listing applications', async () => {
    const withAuth = as('auth-ops');
    const res = await withAuth(request(app).get('/api/applications'));
    expect(res.status).toBe(403);
  });

  it('lets management list and approve an application, promoting it to a live AssetCo', async () => {
    const submitRes = await request(app).post('/api/applications').send({
      companyName: 'BrightFuture Energy',
      primaryContactName: 'Sam Okoro',
      primaryContactEmail: 'sam@brightfuture.example',
    });
    const applicationId = submitRes.body.application.id;

    const withAuth = as('auth-mgmt');
    const listRes = await withAuth(request(app).get('/api/applications'));
    expect(listRes.status).toBe(200);
    expect(listRes.body.applications.some((a) => a.id === applicationId)).toBe(true);

    const reviewRes = await withAuth(
      request(app).put(`/api/applications/${applicationId}/review`).send({
        decision: 'APPROVED',
        assetcoId: 'BRIGHTFUTURE',
        notes: 'Looks solid, approving into onboarding.',
      })
    );
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.application.status).toBe('APPROVED');
    expect(reviewRes.body.application.promoted_assetco_id).toBe('BRIGHTFUTURE');

    const assetco = mockSupabase._store.assetcos.find((a) => a.id === 'BRIGHTFUTURE');
    expect(assetco.pipeline_stage).toBe('ONBOARDING');
    expect(assetco.name).toBe('BrightFuture Energy');
  });

  it('rejects approval without an assetcoId', async () => {
    const submitRes = await request(app).post('/api/applications').send({
      companyName: 'Another Co',
      primaryContactName: 'A B',
      primaryContactEmail: 'a@anotherco.example',
    });
    const applicationId = submitRes.body.application.id;

    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).put(`/api/applications/${applicationId}/review`).send({ decision: 'APPROVED' })
    );
    expect(res.status).toBe(400);
  });
});
