const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
  ],
  assetcos: [
    { id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true },
    { id: 'EMLGRID', name: 'EML', hmac_secret: 'secret2', is_active: true },
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

describe('User management endpoints', () => {
  it('rejects non-admin roles', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).post('/api/users').send({ email: 'new@cef.example', role: 'finance' }));
    expect(res.status).toBe(403);
  });

  it('management can create a CEF-wide user', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).post('/api/users').send({ email: 'finance@cef.example', role: 'finance' }));
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('finance');
    expect(res.body.tempPassword).toBeTruthy();

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'user_created');
    expect(auditEntry.entity_id).toBe(res.body.user.id);
  });

  it('requires assetcoId for an assetco_admin', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/users').send({ email: 'admin@grosolar.example', role: 'assetco_admin' })
    );
    expect(res.status).toBe(400);
  });

  it('creates an assetco_admin scoped to their AssetCo', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app)
        .post('/api/users')
        .send({ email: 'admin@grosolar.example', role: 'assetco_admin', assetcoId: 'GROSOLAR' })
    );
    expect(res.status).toBe(201);
    expect(res.body.user.assetco_id).toBe('GROSOLAR');
  });

  it('requires at least one assetcoId for an assetco_dev', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/users').send({ email: 'dev@buildco.example', role: 'assetco_dev', assetcoIds: [] })
    );
    expect(res.status).toBe(400);
  });

  it('creates an assetco_dev with access to multiple AssetCos', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app)
        .post('/api/users')
        .send({ email: 'dev@buildco.example', role: 'assetco_dev', assetcoIds: ['GROSOLAR', 'EMLGRID'] })
    );
    expect(res.status).toBe(201);
    expect(res.body.user.assetco_ids).toEqual(['GROSOLAR', 'EMLGRID']);

    const accessRows = mockSupabase._store.user_assetco_dev_access.filter((a) => a.user_id === res.body.user.id);
    expect(accessRows.map((a) => a.assetco_id).sort()).toEqual(['EMLGRID', 'GROSOLAR']);
  });

  it('rejects an invalid role', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).post('/api/users').send({ email: 'x@cef.example', role: 'not_a_role' }));
    expect(res.status).toBe(400);
  });

  it('management can reset a user\'s password', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).post('/api/users/user-exec/reset-password'));
    expect(res.status).toBe(200);
    expect(res.body.tempPassword).toBeTruthy();
    expect(res.body.user.email).toBe('exec@cef.example');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'user_password_reset');
    expect(auditEntry.entity_id).toBe('user-exec');
  });

  it('404s resetting a password for an unknown user', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).post('/api/users/does-not-exist/reset-password'));
    expect(res.status).toBe(404);
  });

  it('lists users', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(request(app).get('/api/users'));
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
  });
});
