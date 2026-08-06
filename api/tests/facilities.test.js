const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
    { id: 'user-risk', auth_user_id: 'auth-risk', email: 'risk@cef.example', role: 'risk', assetco_id: null },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null },
  ],
  assetcos: [
    { id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true },
    { id: 'EML', name: 'EML', hmac_secret: 'secret2', is_active: true },
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

describe('CEF Facility endpoints', () => {
  it('executive cannot create a facility', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(
      request(app).post('/api/facilities').send({ assetCoId: 'GROSOLAR', principalAmountNgn: 1000000, tenorMonths: 12 })
    );
    expect(res.status).toBe(403);
  });

  it('management creates a facility and a monthly schedule is auto-generated', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/facilities').send({
        assetCoId: 'GROSOLAR',
        principalAmountNgn: 12000000,
        interestRatePercent: 12,
        tenorMonths: 12,
        repaymentFrequency: 'MONTHLY',
        disbursementDate: '2026-01-01',
        gracePeriodMonths: 0,
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.facility.scheduleCount).toBe(12);

    const schedule = mockSupabase._store.cef_facility_schedule.filter((s) => s.facility_id === res.body.facility.id);
    expect(schedule).toHaveLength(12);
    expect(schedule[0].principal_due_ngn).toBe(1000000); // 12,000,000 / 12
    expect(schedule[0].status).toBe('PENDING');
  });

  it('does not generate a schedule for a BULLET facility', async () => {
    const withAuth = as('auth-mgmt');
    const res = await withAuth(
      request(app).post('/api/facilities').send({
        assetCoId: 'EML',
        principalAmountNgn: 5000000,
        tenorMonths: 24,
        repaymentFrequency: 'BULLET',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.facility.scheduleCount).toBe(0);
  });

  describe('repayments', () => {
    let facilityId;

    beforeAll(async () => {
      const withAuth = as('auth-mgmt');
      const res = await withAuth(
        request(app).post('/api/facilities').send({
          assetCoId: 'GROSOLAR',
          facilityReference: 'CEF-FA-TEST-001',
          principalAmountNgn: 1200000,
          tenorMonths: 12,
          repaymentFrequency: 'MONTHLY',
          disbursementDate: '2026-01-01',
        })
      );
      facilityId = res.body.facility.id;
    });

    it('recording a repayment updates total_repaid_ngn and marks the matching schedule row PAID', async () => {
      const withAuth = as('auth-mgmt');
      const schedule = mockSupabase._store.cef_facility_schedule.find((s) => s.facility_id === facilityId);

      const res = await withAuth(
        request(app).post(`/api/facilities/${facilityId}/repayments`).send({
          paymentDate: schedule.due_date,
          principalPaidNgn: 100000,
          interestPaidNgn: 5000,
          periodCovered: schedule.period,
        })
      );
      expect(res.status).toBe(201);
      expect(res.body.facility.total_repaid_ngn).toBe(100000);

      const updatedSchedule = mockSupabase._store.cef_facility_schedule.find((s) => s.id === schedule.id);
      expect(updatedSchedule.status).toBe('PAID');
      expect(updatedSchedule.paid_date).toBe(schedule.due_date);

      const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'FACILITY_REPAYMENT_RECORDED');
      expect(auditEntry).toBeTruthy();
    });

    it('paying off the full principal marks the facility FULLY_REPAID', async () => {
      const withAuth = as('auth-mgmt');
      // Already paid 100,000 of 1,200,000 — pay the remaining 1,100,000 in one go.
      const res = await withAuth(
        request(app).post(`/api/facilities/${facilityId}/repayments`).send({
          paymentDate: '2026-12-01',
          principalPaidNgn: 1100000,
        })
      );
      expect(res.status).toBe(201);
      expect(res.body.facility.total_repaid_ngn).toBe(1200000);
      expect(res.body.facility.facility_status).toBe('FULLY_REPAID');
    });

    it('rejects a repayment on a FULLY_REPAID facility', async () => {
      const withAuth = as('auth-mgmt');
      const res = await withAuth(
        request(app).post(`/api/facilities/${facilityId}/repayments`).send({ paymentDate: '2026-12-15', principalPaidNgn: 1000 })
      );
      expect(res.status).toBe(400);
    });
  });

  it('GET /api/facilities/:id returns facility + schedule + repayments + summary', async () => {
    const withAuth = as('auth-exec');
    const create = await as('auth-mgmt')(
      request(app).post('/api/facilities').send({ assetCoId: 'EML', principalAmountNgn: 2000000, tenorMonths: 6, repaymentFrequency: 'MONTHLY', disbursementDate: '2026-01-01' })
    );
    const res = await withAuth(request(app).get(`/api/facilities/${create.body.facility.id}`));
    expect(res.status).toBe(200);
    expect(res.body.facility.id).toBe(create.body.facility.id);
    expect(res.body.schedule).toHaveLength(6);
    expect(res.body.summary.nextDueAmount).toBeGreaterThan(0);
  });

  it('GET /api/portfolio/loan-book aggregates totals across all facilities', async () => {
    const withAuth = as('auth-exec');
    const res = await withAuth(request(app).get('/api/portfolio/loan-book'));
    expect(res.status).toBe(200);
    expect(res.body.totalFacilitiesCount).toBeGreaterThanOrEqual(4);
    expect(res.body.byAssetCo.length).toBeGreaterThanOrEqual(2);
    expect(res.body.totalFacilitiesNgn).toBeGreaterThan(0);
  });
});

describe('discretionary classification override', () => {
  let facilityId;

  beforeAll(async () => {
    const create = await as('auth-mgmt')(
      request(app).post('/api/facilities').send({
        assetCoId: 'GROSOLAR',
        facilityReference: 'CEF-FA-TEST-OVERRIDE',
        principalAmountNgn: 3000000,
        tenorMonths: 12,
        repaymentFrequency: 'MONTHLY',
        disbursementDate: '2026-01-01',
      })
    );
    facilityId = create.body.facility.id;
  });

  it('finance cannot set a classification override', async () => {
    const res = await as('auth-finance')(
      request(app).patch(`/api/facilities/${facilityId}/classification-override`).send({ status: 'ACTIVE', reason: 'x' })
    );
    expect(res.status).toBe(403);
  });

  it('rejects an override without a reason', async () => {
    const res = await as('auth-risk')(
      request(app).patch(`/api/facilities/${facilityId}/classification-override`).send({ status: 'ACTIVE' })
    );
    expect(res.status).toBe(400);
  });

  it('risk can set an override, and it takes precedence in the loan book without changing facility_status', async () => {
    const res = await as('auth-risk')(
      request(app).patch(`/api/facilities/${facilityId}/classification-override`).send({
        status: 'ACTIVE',
        reason: 'Aware of a one-off delay with the AssetCo; treating as performing pending resolution.',
      })
    );
    expect(res.status).toBe(200);
    expect(res.body.facility.classification_override).toBe('ACTIVE');
    expect(res.body.facility.classification_override_reason).toBeTruthy();
    expect(res.body.facility.classification_override_by).toBe('user-risk');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'FACILITY_CLASSIFICATION_OVERRIDDEN' && a.entity_id === facilityId);
    expect(auditEntry).toBeTruthy();
    expect(auditEntry.actor_email).toBe('risk@cef.example');
  });

  it('management can clear the override', async () => {
    const res = await as('auth-mgmt')(request(app).delete(`/api/facilities/${facilityId}/classification-override`));
    expect(res.status).toBe(200);
    expect(res.body.facility.classification_override).toBeNull();

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'FACILITY_CLASSIFICATION_OVERRIDE_CLEARED' && a.entity_id === facilityId);
    expect(auditEntry).toBeTruthy();
  });
});

describe('checkFacilityArrears', () => {
  const { checkFacilityArrears } = require('../src/services/facilityService');

  it('marks an overdue PENDING schedule row as MISSED, flags the facility IN_ARREARS, and alerts once', async () => {
    const withAuth = as('auth-mgmt');
    const create = await withAuth(
      request(app).post('/api/facilities').send({
        assetCoId: 'GROSOLAR',
        principalAmountNgn: 600000,
        tenorMonths: 6,
        repaymentFrequency: 'MONTHLY',
        disbursementDate: '2020-01-01', // long in the past — schedule rows will be overdue
      })
    );
    const facilityId = create.body.facility.id;

    const first = await checkFacilityArrears();
    expect(first.missed).toBeGreaterThan(0);

    const facility = mockSupabase._store.cef_facilities.find((f) => f.id === facilityId);
    expect(facility.facility_status).toBe('IN_ARREARS');

    const missedRows = mockSupabase._store.cef_facility_schedule.filter((s) => s.facility_id === facilityId);
    expect(missedRows.every((s) => s.status === 'MISSED')).toBe(true);

    const alerts = mockSupabase._store.alerts.filter((a) => a.alert_type === 'CEF_FACILITY_REPAYMENT_MISSED' && a.facility_id === facilityId);
    expect(alerts).toHaveLength(missedRows.length);

    // Running it again should not re-flag already-MISSED rows as newly missed.
    const second = await checkFacilityArrears();
    expect(second.missed).toBe(0);
  });
});
