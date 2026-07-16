const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null },
    { id: 'user-risk', auth_user_id: 'auth-risk', email: 'risk@cef.example', role: 'risk', assetco_id: null },
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-it', auth_user_id: 'auth-it', email: 'it@cef.example', role: 'it_admin', assetco_id: null },
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

describe('Approval workflow (CEF Series)', () => {
  it('approving a pending series-create request actually creates the series and notifies the requester', async () => {
    const createRes = await as('auth-finance')(
      request(app).post('/api/series').send({ code: 'SERIES_X', displayName: 'Series X' })
    );
    expect(createRes.status).toBe(202);
    const requestId = createRes.body.approvalRequest.id;

    // Finance sees only their own request; management sees the full queue.
    const financeList = await as('auth-finance')(request(app).get('/api/approvals'));
    expect(financeList.body.requests).toHaveLength(1);
    const mgmtList = await as('auth-mgmt')(request(app).get('/api/approvals'));
    expect(mgmtList.body.requests.some((r) => r.id === requestId)).toBe(true);

    const approveRes = await as('auth-mgmt')(request(app).post(`/api/approvals/${requestId}/approve`));
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.request.status).toBe('approved');
    expect(approveRes.body.request.decided_by_email).toBe('mgmt@cef.example');

    const created = mockSupabase._store.cef_series.find((s) => s.code === 'SERIES_X');
    expect(created).toBeTruthy();

    const financeUnread = await as('auth-finance')(request(app).get('/api/notifications/mine/unread-count'));
    expect(financeUnread.body.unreadCount).toBe(1);
  });

  it('rejecting a request does not apply the change', async () => {
    const createRes = await as('auth-risk')(
      request(app).post('/api/series').send({ code: 'SERIES_Y', displayName: 'Series Y' })
    );
    const requestId = createRes.body.approvalRequest.id;

    const rejectRes = await as('auth-it')(
      request(app).post(`/api/approvals/${requestId}/reject`).send({ notes: 'Not needed yet' })
    );
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.request.status).toBe('rejected');

    const created = mockSupabase._store.cef_series.find((s) => s.code === 'SERIES_Y');
    expect(created).toBeUndefined();
  });

  it('a request cannot be decided twice', async () => {
    const createRes = await as('auth-finance')(
      request(app).post('/api/series').send({ code: 'SERIES_Z', displayName: 'Series Z' })
    );
    const requestId = createRes.body.approvalRequest.id;

    await as('auth-mgmt')(request(app).post(`/api/approvals/${requestId}/approve`));
    const secondDecision = await as('auth-mgmt')(request(app).post(`/api/approvals/${requestId}/reject`));
    expect(secondDecision.status).toBe(400);
  });

  it('finance cannot approve or reject requests', async () => {
    const createRes = await as('auth-risk')(
      request(app).post('/api/series').send({ code: 'SERIES_W', displayName: 'Series W' })
    );
    const requestId = createRes.body.approvalRequest.id;

    const res = await as('auth-finance')(request(app).post(`/api/approvals/${requestId}/approve`));
    expect(res.status).toBe(403);
  });
});
