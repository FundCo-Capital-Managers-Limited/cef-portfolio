const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [{ id: 'user-1', auth_user_id: 'auth-uid-1', email: 'exec@cef.example', role: 'management', assetco_id: null }],
});

jest.mock('../src/config/supabase', () => mockSupabase);

const mockVerifyAccessToken = jest.fn();
jest.mock('../src/services/jwtVerifier', () => ({
  verifyAccessToken: (...args) => mockVerifyAccessToken(...args),
}));

const request = require('supertest');
const app = require('../src/app');

function authed(req) {
  return req.set('Authorization', 'Bearer valid-token');
}

describe('Supabase JWT auth + notifications', () => {
  beforeEach(() => {
    mockVerifyAccessToken.mockReset();
  });

  it('rejects requests with no bearer token', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });

  it('rejects a token that fails verification', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('bad signature'));
    const res = await authed(request(app).get('/api/notifications/unread-count'));
    expect(res.status).toBe(401);
  });

  it('rejects a valid token for a user not provisioned in public.users', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'unknown-auth-uid' });
    const res = await authed(request(app).get('/api/notifications/unread-count'));
    expect(res.status).toBe(403);
  });

  it('bootstraps the cursor at "now" on first check, so unreadCount starts at 0', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'auth-uid-1' });
    const res = await authed(request(app).get('/api/notifications/unread-count'));
    expect(res.status).toBe(200);
    expect(res.body.unreadCount).toBe(0);
  });

  it('counts audit_log entries newer than the cursor, and mark-seen resets it', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'auth-uid-1' });

    // Ensure a cursor exists first (bootstraps to "now").
    const bootstrap = await authed(request(app).get('/api/notifications/unread-count'));
    const cursorTime = new Date(bootstrap.body.lastSeenAt).getTime();

    // Simulate a change made just after the cursor was set — not relative to
    // wall-clock "now", since mark-seen's own "now" a moment later must still
    // land after this entry's timestamp for the reset to be observable.
    mockSupabase._store.audit_log.push({
      id: 'log-1',
      actor_type: 'user',
      actor_assetco_id: 'DEMOSOLAR',
      action: 'ASSETCO_STAGE_CHANGED',
      entity_type: 'assetco',
      entity_id: 'DEMOSOLAR',
      details: { toStage: 'DUE_DILIGENCE' },
      created_at: new Date(cursorTime + 1).toISOString(),
    });

    const unread = await authed(request(app).get('/api/notifications/unread-count'));
    expect(unread.body.unreadCount).toBe(1);

    const recent = await authed(request(app).get('/api/notifications/recent'));
    expect(recent.body.items).toHaveLength(1);
    expect(recent.body.items[0].entity_type).toBe('assetco');

    const markSeen = await authed(request(app).post('/api/notifications/mark-seen'));
    expect(markSeen.status).toBe(200);

    const afterMarkSeen = await authed(request(app).get('/api/notifications/unread-count'));
    expect(afterMarkSeen.body.unreadCount).toBe(0);
  });
});
