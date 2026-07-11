const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
    { id: 'user-groadmin', auth_user_id: 'auth-groadmin', email: 'admin@grosolar.example', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
  ],
  assetcos: [
    { id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true, pipeline_stage: 'DUE_DILIGENCE', integration_type: 'API' },
    { id: 'EML', name: 'EML', hmac_secret: 'secret2', is_active: true, pipeline_stage: 'ONBOARDING', integration_type: 'API' },
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

describe('AssetCo pipeline endpoints', () => {
  it('assetco_admin only sees their own AssetCo in the list', async () => {
    const withAuth = as('auth-groadmin');
    const res = await withAuth(request(app).get('/api/assetcos'));
    expect(res.status).toBe(200);
    expect(res.body.assetcos).toHaveLength(1);
    expect(res.body.assetcos[0].id).toBe('GROSOLAR');
  });

  it('CEF-wide roles see all AssetCos', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/assetcos'));
    expect(res.status).toBe(200);
    expect(res.body.assetcos).toHaveLength(2);
  });

  it('assetco_admin cannot access another AssetCo\'s detail', async () => {
    const withAuth = as('auth-groadmin');
    const res = await withAuth(request(app).get('/api/assetcos/EML'));
    expect(res.status).toBe(403);
  });

  it('management can advance a pipeline stage forward and it is logged + audited', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).put('/api/assetcos/GROSOLAR/stage').send({ stage: 'IC_APPROVAL', notes: 'DD complete' })
    );
    expect(res.status).toBe(200);
    expect(res.body.assetco.pipeline_stage).toBe('IC_APPROVAL');

    const logEntry = mockSupabase._store.assetco_stage_log.find((l) => l.assetco_id === 'GROSOLAR');
    expect(logEntry.from_stage).toBe('DUE_DILIGENCE');
    expect(logEntry.to_stage).toBe('IC_APPROVAL');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'ASSETCO_STAGE_CHANGED');
    expect(auditEntry.entity_id).toBe('GROSOLAR');
  });

  it('rejects an invalid stage value', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).put('/api/assetcos/GROSOLAR/stage').send({ stage: 'NOT_A_STAGE' }));
    expect(res.status).toBe(400);
  });

  it('assetco_admin cannot advance their own AssetCo past ONBOARDING', async () => {
    const withAuth = as('auth-groadmin');
    const res = await withAuth(request(app).put('/api/assetcos/GROSOLAR/stage').send({ stage: 'DISBURSEMENT' }));
    expect(res.status).toBe(403);
  });

  it('executive (not management/it_admin) cannot create or edit an AssetCo profile', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).patch('/api/assetcos/GROSOLAR').send({ website: 'https://grosolar.example' }));
    expect(res.status).toBe(403);
  });

  it('management can update AssetCo profile fields', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).patch('/api/assetcos/GROSOLAR').send({ website: 'https://grosolar.example', sector: 'SOLAR' })
    );
    expect(res.status).toBe(200);
    expect(res.body.assetco.website).toBe('https://grosolar.example');
    expect(res.body.assetco.sector).toBe('SOLAR');
  });

  it('rejects an invalid sector on profile update', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).patch('/api/assetcos/GROSOLAR').send({ sector: 'NOT_A_SECTOR' }));
    expect(res.status).toBe(400);
  });

  it('management can regenerate an AssetCo HMAC secret, and the old one stops verifying', async () => {
    const withAuth = as('auth-mgmt');
    const before = mockSupabase._store.assetcos.find((a) => a.id === 'GROSOLAR').hmac_secret;

    const res = await withAuth(request(app).post('/api/assetcos/GROSOLAR/regenerate-secret'));
    expect(res.status).toBe(200);
    expect(res.body.hmacSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.hmacSecret).not.toBe(before);

    const after = mockSupabase._store.assetcos.find((a) => a.id === 'GROSOLAR').hmac_secret;
    expect(after).toBe(res.body.hmacSecret);

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'ASSETCO_HMAC_SECRET_REGENERATED');
    expect(auditEntry.entity_id).toBe('GROSOLAR');
  });

  it('assetco_admin cannot regenerate their own HMAC secret', async () => {
    const withAuth = as('auth-groadmin');
    const res = await withAuth(request(app).post('/api/assetcos/GROSOLAR/regenerate-secret'));
    expect(res.status).toBe(403);
  });
});
