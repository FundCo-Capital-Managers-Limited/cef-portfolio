const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString().slice(0, 10);
};
const longOverdue = () => {
  const d = new Date();
  d.setDate(d.getDate() - 100);
  return d.toISOString().slice(0, 10);
};

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-admin', auth_user_id: 'auth-admin', email: 'admin@grosolar.example.com', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
  cef_facilities: [
    { id: 'facility-1', assetco_id: 'GROSOLAR', outstanding_balance_ngn: 1000000, facility_status: 'ACTIVE' },
  ],
  cef_facility_schedule: [
    { id: 'sched-1', facility_id: 'facility-1', due_date: yesterday(), status: 'MISSED', total_due_ngn: 100000, paid_amount_ngn: 0 },
    { id: 'sched-2', facility_id: 'facility-1', due_date: longOverdue(), status: 'MISSED', total_due_ngn: 50000, paid_amount_ngn: 0 },
  ],
  facility_documents: [
    { id: 'doc-1', facility_id: 'facility-1', status: 'EXECUTED' },
    { id: 'doc-2', facility_id: 'facility-1', status: 'DRAFT' },
  ],
  facility_security: [
    { id: 'sec-1', facility_id: 'facility-1', value_ngn: 400000, perfection_status: 'Executed / Signed' },
  ],
  facility_covenants: [
    { id: 'cov-1', facility_id: 'facility-1', covenant_type: 'FINANCIAL', compliance_status: 'NON_COMPLIANT' },
    { id: 'cov-2', facility_id: 'facility-1', covenant_type: 'REPORTING', compliance_status: 'COMPLIANT' },
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

describe('Facility portfolio risk summary (Module D)', () => {
  it('computes PAR buckets, documentation completeness, collateral coverage, and covenant breaches', async () => {
    const res = await as('auth-mgmt')(request(app).get('/api/portfolio/risk-summary'));
    expect(res.status).toBe(200);

    const { summary } = res.body;
    expect(summary.parBuckets.par1To30).toBe(100000);
    expect(summary.parBuckets.par91Plus).toBe(50000);
    expect(summary.documentationCompletenessPercent).toBe(50);
    expect(summary.totalSecurityValueNgn).toBe(400000);
    expect(summary.collateralCoverageRatio).toBeCloseTo(0.4);
    expect(summary.covenantBreachCount).toBe(1);
    expect(summary.covenantBreachByType.FINANCIAL).toBe(1);
    expect(summary.covenantBreachByType.REPORTING).toBe(0);
  });

  it('rejects a non-CEF-wide role', async () => {
    const res = await as('auth-admin')(request(app).get('/api/portfolio/risk-summary'));
    expect(res.status).toBe(403);
  });
});
