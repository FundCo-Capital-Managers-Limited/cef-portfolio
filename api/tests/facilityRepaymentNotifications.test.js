const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null },
    { id: 'user-ops', auth_user_id: 'auth-ops', email: 'ops@cef.example', role: 'ops', assetco_id: null },
    { id: 'user-admin', auth_user_id: 'auth-admin', email: 'admin@grosolar.example.com', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
    { id: 'user-admin-other', auth_user_id: 'auth-admin-other', email: 'admin@other.example.com', role: 'assetco_admin', assetco_id: 'OTHERCO' },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
  cef_facilities: [
    { id: 'facility-1', assetco_id: 'GROSOLAR', facility_reference: 'CEF-FA-001', principal_amount_ngn: 1000000, total_repaid_ngn: 0, outstanding_balance_ngn: 1000000, facility_status: 'ACTIVE' },
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

describe('Facility repayment notify-then-confirm workflow', () => {
  it('an AssetCo rep can no longer record a repayment directly - only CEF staff can', async () => {
    const res = await as('auth-admin')(
      request(app).post('/api/facilities/facility-1/repayments').send({ paymentDate: '2026-08-01', principalPaidNgn: 50000 })
    );
    expect(res.status).toBe(403);
  });

  it('ops (not finance/risk/management/it_admin) also cannot record a repayment directly', async () => {
    const res = await as('auth-ops')(
      request(app).post('/api/facilities/facility-1/repayments').send({ paymentDate: '2026-08-01', principalPaidNgn: 50000 })
    );
    expect(res.status).toBe(403);
  });

  it('the AssetCo\'s own admin can submit a repayment notification', async () => {
    const res = await as('auth-admin')(
      request(app).post('/api/facilities/facility-1/repayment-notifications').send({
        amountNgn: 100000,
        paymentDate: '2026-08-01',
        paymentReference: 'BANK-REF-123',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.notification.status).toBe('PENDING');

    const notifyEntry = mockSupabase._store.notifications.find((n) => n.type === 'facility_repayment_notified');
    expect(notifyEntry).toBeTruthy();
  });

  it('a different AssetCo\'s admin cannot submit a notification for this facility', async () => {
    const res = await as('auth-admin-other')(
      request(app).post('/api/facilities/facility-1/repayment-notifications').send({ amountNgn: 1000, paymentDate: '2026-08-01' })
    );
    expect(res.status).toBe(403);
  });

  it('an AssetCo admin cannot confirm their own notification', async () => {
    const listRes = await as('auth-admin')(request(app).get('/api/facilities/facility-1/repayment-notifications'));
    const notificationId = listRes.body.notifications[0].id;

    const res = await as('auth-admin')(request(app).post(`/api/facilities/repayment-notifications/${notificationId}/confirm`));
    expect(res.status).toBe(403);
  });

  it('finance can confirm a pending notification, which records a real repayment and links it back', async () => {
    const pendingRes = await as('auth-finance')(request(app).get('/api/facilities/repayment-notifications/pending'));
    expect(pendingRes.status).toBe(200);
    const notificationId = pendingRes.body.notifications[0].id;

    const confirmRes = await as('auth-finance')(request(app).post(`/api/facilities/repayment-notifications/${notificationId}/confirm`));
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.notification.status).toBe('CONFIRMED');
    expect(confirmRes.body.notification.resulting_repayment_id).toBeTruthy();
    expect(confirmRes.body.facility.total_repaid_ngn).toBe(100000);

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'FACILITY_REPAYMENT_NOTIFICATION_CONFIRMED');
    expect(auditEntry).toBeTruthy();
  });

  it('rejects confirming an already-confirmed notification', async () => {
    const historyRes = await as('auth-mgmt')(request(app).get('/api/facilities/facility-1/repayment-notifications'));
    const confirmedId = historyRes.body.notifications.find((n) => n.status === 'CONFIRMED').id;

    const res = await as('auth-finance')(request(app).post(`/api/facilities/repayment-notifications/${confirmedId}/confirm`));
    expect(res.status).toBe(400);
  });

  it('risk can reject a pending notification with a reason, and the submitter is notified', async () => {
    const submitRes = await as('auth-admin')(
      request(app).post('/api/facilities/facility-1/repayment-notifications').send({ amountNgn: 5000, paymentDate: '2026-08-02' })
    );
    const notificationId = submitRes.body.notification.id;

    const res = await as('auth-finance')(
      request(app).post(`/api/facilities/repayment-notifications/${notificationId}/reject`).send({ reason: 'Amount does not match bank statement' })
    );
    expect(res.status).toBe(200);
    expect(res.body.notification.status).toBe('REJECTED');
    expect(res.body.notification.rejection_reason).toBe('Amount does not match bank statement');

    const rejectNotifyEntry = mockSupabase._store.notifications.find((n) => n.type === 'facility_repayment_rejected');
    expect(rejectNotifyEntry).toBeTruthy();
  });
});
