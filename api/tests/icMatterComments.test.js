const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false },
    { id: 'user-board', auth_user_id: 'auth-board', email: 'board1@cef.example', role: 'board_member', assetco_id: null, can_access_ic: false },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null, can_access_ic: false },
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

describe('IC matter pre-meeting Q&A', () => {
  it('a board member can read a matter and post a question ahead of the meeting', async () => {
    const createRes = await as('auth-mgmt')(
      request(app).post('/api/ic/matters').send({ category: 'NEW_INVESTMENT', decisionType: 'Preliminary approval', title: 'GroSolar Series C' })
    );
    const matterId = createRes.body.matter.id;

    const commentRes = await as('auth-board')(
      request(app).post(`/api/ic/matters/${matterId}/comments`).send({ body: 'What is the current collateral coverage on this facility?' })
    );
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.comment.author_email).toBe('board1@cef.example');

    const listRes = await as('auth-mgmt')(request(app).get(`/api/ic/matters/${matterId}/comments`));
    expect(listRes.status).toBe(200);
    expect(listRes.body.comments).toHaveLength(1);

    const notificationsRes = await as('auth-mgmt')(request(app).get('/api/notifications/mine/unread-count'));
    expect(notificationsRes.body.unreadCount).toBe(1);
  });

  it('rejects an empty comment', async () => {
    const createRes = await as('auth-mgmt')(
      request(app).post('/api/ic/matters').send({ category: 'POLICY', decisionType: 'x', title: 'Test matter' })
    );
    const matterId = createRes.body.matter.id;

    const res = await as('auth-board')(request(app).post(`/api/ic/matters/${matterId}/comments`).send({ body: '  ' }));
    expect(res.status).toBe(400);
  });

  it('a user without IC access cannot read or post comments', async () => {
    const createRes = await as('auth-mgmt')(
      request(app).post('/api/ic/matters').send({ category: 'POLICY', decisionType: 'x', title: 'Another matter' })
    );
    const matterId = createRes.body.matter.id;

    const res = await as('auth-finance')(request(app).get(`/api/ic/matters/${matterId}/comments`));
    expect(res.status).toBe(403);
  });
});
