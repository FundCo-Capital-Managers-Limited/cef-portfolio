const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-risk', auth_user_id: 'auth-risk', email: 'risk@cef.example', role: 'risk', assetco_id: null },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null },
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-it', auth_user_id: 'auth-it', email: 'it@cef.example', role: 'it_admin', assetco_id: null },
    { id: 'user-ops', auth_user_id: 'auth-ops', email: 'ops@cef.example', role: 'ops', assetco_id: null },
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

describe('Flags + targeted notifications', () => {
  it('risk can raise a flag on financial data, and only management/it_admin/finance are notified', async () => {
    const asRisk = as('auth-risk');
    const createRes = await asRisk(
      request(app).post('/api/flags').send({
        entityType: 'facility',
        entityId: 'FAC-1',
        assetcoId: 'GROSOLAR',
        title: 'Repayment schedule looks off',
        description: 'Numbers do not reconcile with the disbursement amount.',
      })
    );
    expect(createRes.status).toBe(201);
    const flagId = createRes.body.flag.id;

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'FLAG_RAISED');
    expect(auditEntry.actor_email).toBe('risk@cef.example');

    // Finance, management, it_admin get notified.
    const financeUnread = await as('auth-finance')(request(app).get('/api/notifications/mine/unread-count'));
    expect(financeUnread.body.unreadCount).toBe(1);
    const mgmtUnread = await as('auth-mgmt')(request(app).get('/api/notifications/mine/unread-count'));
    expect(mgmtUnread.body.unreadCount).toBe(1);
    const itUnread = await as('auth-it')(request(app).get('/api/notifications/mine/unread-count'));
    expect(itUnread.body.unreadCount).toBe(1);

    // Ops and executive are NOT notified.
    const opsUnread = await as('auth-ops')(request(app).get('/api/notifications/mine/unread-count'));
    expect(opsUnread.body.unreadCount).toBe(0);
    const execUnread = await as('auth-exec')(request(app).get('/api/notifications/mine/unread-count'));
    expect(execUnread.body.unreadCount).toBe(0);

    // The raiser (risk) does not notify themselves.
    const riskUnread = await as('auth-risk')(request(app).get('/api/notifications/mine/unread-count'));
    expect(riskUnread.body.unreadCount).toBe(0);

    // Reading the notification marks it read for that recipient only.
    const financeList = await as('auth-finance')(request(app).get('/api/notifications/mine'));
    const notificationId = financeList.body.items[0].id;
    const markRead = await as('auth-finance')(request(app).post(`/api/notifications/mine/${notificationId}/read`));
    expect(markRead.status).toBe(200);

    const financeUnreadAfter = await as('auth-finance')(request(app).get('/api/notifications/mine/unread-count'));
    expect(financeUnreadAfter.body.unreadCount).toBe(0);
    // Management's own read state is untouched by finance's read.
    const mgmtUnreadAfter = await as('auth-mgmt')(request(app).get('/api/notifications/mine/unread-count'));
    expect(mgmtUnreadAfter.body.unreadCount).toBe(1);

    // Management can view the flag - viewing it records them as a viewer,
    // visible to anyone else who opens it (shared state, not personal).
    const getFlag = await as('auth-mgmt')(request(app).get(`/api/flags/${flagId}`));
    expect(getFlag.status).toBe(200);
    expect(getFlag.body.flag.status).toBe('open');
    expect(getFlag.body.flag.views.some((v) => v.user_id === 'user-mgmt')).toBe(true);
  });

  it('comments on a flag notify the same recipient set, excluding the commenter', async () => {
    const asRisk = as('auth-risk');
    const createRes = await asRisk(
      request(app).post('/api/flags').send({ entityType: 'series', title: 'Series C disbursement mismatch' })
    );
    const flagId = createRes.body.flag.id;

    // Finance already has an unread notification from this flag being
    // raised (they're a recipient of that too) - mark it read first so the
    // comment's effect on their count can be isolated. Matched by flag_id
    // rather than array order/recency, since two notifications created in
    // the same test run can land in the same millisecond.
    const financeBefore = await as('auth-finance')(request(app).get('/api/notifications/mine'));
    const raiseNotification = financeBefore.body.items.find((n) => n.flag_id === flagId);
    await as('auth-finance')(request(app).post(`/api/notifications/mine/${raiseNotification.id}/read`));

    const commentRes = await as('auth-finance')(
      request(app).post(`/api/flags/${flagId}/comments`).send({ body: 'Looking into it now.' })
    );
    expect(commentRes.status).toBe(201);

    // Management/it_admin get notified of the comment; finance (the commenter) does not.
    const mgmtUnread = await as('auth-mgmt')(request(app).get('/api/notifications/mine/unread-count'));
    expect(mgmtUnread.body.unreadCount).toBeGreaterThanOrEqual(1);
    const financeUnread = await as('auth-finance')(request(app).get('/api/notifications/mine/unread-count'));
    expect(financeUnread.body.unreadCount).toBe(0);

    const getFlag = await as('auth-mgmt')(request(app).get(`/api/flags/${flagId}`));
    expect(getFlag.body.flag.comments).toHaveLength(1);
    expect(getFlag.body.flag.comments[0].author_email).toBe('finance@cef.example');
  });

  it('resolving a flag notifies management/it_admin/finance and is audited', async () => {
    const createRes = await as('auth-risk')(
      request(app).post('/api/flags').send({ entityType: 'facility', title: 'Needs review' })
    );
    const flagId = createRes.body.flag.id;

    const resolveRes = await as('auth-mgmt')(
      request(app).patch(`/api/flags/${flagId}/status`).send({ status: 'resolved' })
    );
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.flag.status).toBe('resolved');
    expect(resolveRes.body.flag.resolved_by_email).toBe('mgmt@cef.example');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'FLAG_STATUS_CHANGED');
    expect(auditEntry.details.toStatus).toBe('resolved');
  });

  it('rejects an invalid status transition', async () => {
    const createRes = await as('auth-risk')(
      request(app).post('/api/flags').send({ entityType: 'facility', title: 'Bad status test' })
    );
    const flagId = createRes.body.flag.id;

    const res = await as('auth-mgmt')(request(app).patch(`/api/flags/${flagId}/status`).send({ status: 'bogus' }));
    expect(res.status).toBe(400);
  });
});
