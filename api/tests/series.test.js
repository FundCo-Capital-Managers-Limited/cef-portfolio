const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null },
    { id: 'user-risk', auth_user_id: 'auth-risk', email: 'risk@cef.example', role: 'risk', assetco_id: null },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
  cef_series: [
    { id: 'series-a', code: 'SERIES_A', display_name: 'Series A', status: 'CLOSED' },
    { id: 'series-b', code: 'SERIES_B', display_name: 'Series B', status: 'CLOSED' },
  ],
  assetco_series: [
    { id: 'link-1', assetco_id: 'GROSOLAR', series_id: 'series-a', disbursement_amount_ngn: 200000000, instrument_type: 'DEBT', status: 'DISBURSED' },
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

describe('CEF Series endpoints', () => {
  it('GET /api/series returns each series with computed total_deployed_ngn', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/series'));
    expect(res.status).toBe(200);
    const seriesA = res.body.series.find((s) => s.code === 'SERIES_A');
    expect(seriesA.total_deployed_ngn).toBe(200000000);
    expect(seriesA.assetco_count).toBe(1);
    const seriesB = res.body.series.find((s) => s.code === 'SERIES_B');
    expect(seriesB.total_deployed_ngn).toBe(0);
  });

  it('GET /api/series/:code/assetcos lists linked AssetCos', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/series/SERIES_A/assetcos'));
    expect(res.status).toBe(200);
    expect(res.body.links).toHaveLength(1);
    expect(res.body.links[0].assetco.name).toBe('GroSolar');
  });

  it('404s for an unknown series code', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/series/SERIES_Z/assetcos'));
    expect(res.status).toBe(404);
  });

  it('executive cannot link an AssetCo to a series', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(
      request(app).post('/api/assetcos/GROSOLAR/series').send({ seriesId: 'series-b' })
    );
    expect(res.status).toBe(403);
  });

  it('management can link an AssetCo to a series, and it is audited', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/assetcos/GROSOLAR/series').send({
        seriesId: 'series-b',
        disbursementAmountNgn: 150000000,
        instrumentType: 'DEBT',
        status: 'DISBURSED',
      })
    );
    expect(res.status).toBe(200);
    expect(res.body.links).toHaveLength(2);

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'ASSETCO_LINKED_TO_SERIES');
    expect(auditEntry).toBeTruthy();
  });

  it('rejects an unknown seriesId', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/assetcos/GROSOLAR/series').send({ seriesId: 'not-a-real-series' })
    );
    expect(res.status).toBe(400);
  });

  it('executive cannot create a series', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(
      request(app).post('/api/series').send({ code: 'SERIES_D', displayName: 'Series D' })
    );
    expect(res.status).toBe(403);
  });

  it('management can create a new series', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/series').send({ code: 'SERIES_D', displayName: 'Series D', status: 'PLANNING' })
    );
    expect(res.status).toBe(201);
    expect(res.body.series.code).toBe('SERIES_D');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'SERIES_CREATED');
    expect(auditEntry).toBeTruthy();
    expect(auditEntry.actor_email).toBe('mgmt@cef.example');
  });

  it('finance creating or editing a series submits a pending approval request instead of applying immediately', async () => {
    const withAuth = as('auth-finance');
    const createRes = await withAuth(
      request(app).post('/api/series').send({ code: 'SERIES_F', displayName: 'Series F' })
    );
    expect(createRes.status).toBe(202);
    expect(createRes.body.approvalRequest.status).toBe('pending');
    expect(createRes.body.approvalRequest.action_type).toBe('SERIES_CREATE');

    // Not created yet - still pending.
    const seriesAfterSubmit = mockSupabase._store.cef_series.find((s) => s.code === 'SERIES_F');
    expect(seriesAfterSubmit).toBeUndefined();

    const updateRes = await withAuth(
      request(app).patch('/api/series/series-a').send({ totalFundSizeNgn: 500000000 })
    );
    expect(updateRes.status).toBe(202);
    expect(updateRes.body.approvalRequest.action_type).toBe('SERIES_UPDATE');

    const deleteRes = await withAuth(request(app).delete('/api/series/series-a'));
    expect(deleteRes.status).toBe(403);
  });

  it('risk creating a series also requires approval, and cannot delete one', async () => {
    const withAuth = as('auth-risk');
    const createRes = await withAuth(
      request(app).post('/api/series').send({ code: 'SERIES_R', displayName: 'Series R' })
    );
    expect(createRes.status).toBe(202);
    expect(createRes.body.approvalRequest.status).toBe('pending');

    const deleteRes = await withAuth(request(app).delete('/api/series/series-a'));
    expect(deleteRes.status).toBe(403);
  });

  it('rejects creating a series with a duplicate code', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/series').send({ code: 'SERIES_A', displayName: 'Duplicate' })
    );
    expect(res.status).toBe(400);
  });

  it('rejects a malformed series code', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/series').send({ code: 'series-e', displayName: 'Series E' })
    );
    expect(res.status).toBe(400);
  });

  it('management can delete a series with no links', async () => {
    const withAuth = as('auth-mgmt');
    const createRes = await withAuth(
      request(app).post('/api/series').send({ code: 'SERIES_TO_DELETE', displayName: 'Temp Series' })
    );
    const res = await withAuth(request(app).delete(`/api/series/${createRes.body.series.id}`));
    expect(res.status).toBe(204);
  });

  it('refuses to delete a series that still has AssetCos linked', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).delete('/api/series/series-a'));
    expect(res.status).toBe(400);
  });
});
