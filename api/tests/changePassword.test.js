const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-1', auth_user_id: 'auth-1', email: 'person@cef.example', role: 'finance', assetco_id: null, _password: 'correct-horse' },
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

describe('POST /api/auth/change-password', () => {
  it('requires a valid session', async () => {
    const res = await request(app).post('/api/auth/change-password').send({ currentPassword: 'x', newPassword: 'y' });
    expect(res.status).toBe(401);
  });

  it('changes the password when the current password is correct', async () => {
    const withAuth = as('auth-1');
    const res = await withAuth(
      request(app).post('/api/auth/change-password').send({ currentPassword: 'correct-horse', newPassword: 'a-brand-new-password' })
    );
    expect(res.status).toBe(200);

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'user_password_changed_self');
    expect(auditEntry.entity_id).toBe('user-1');
  });

  it('rejects with the wrong current password', async () => {
    const withAuth = as('auth-1');
    const res = await withAuth(
      request(app).post('/api/auth/change-password').send({ currentPassword: 'wrong-guess', newPassword: 'a-brand-new-password' })
    );
    expect(res.status).toBe(401);
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const withAuth = as('auth-1');
    const res = await withAuth(
      request(app).post('/api/auth/change-password').send({ currentPassword: 'correct-horse', newPassword: 'short' })
    );
    expect(res.status).toBe(400);
  });
});
