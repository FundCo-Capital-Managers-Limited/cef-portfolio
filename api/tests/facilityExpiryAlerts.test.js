const { createFakeSupabase } = require('./testUtils/fakeSupabase');

function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-risk', auth_user_id: 'auth-risk', email: 'risk@cef.example', role: 'risk', assetco_id: null },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null },
    { id: 'user-ops', auth_user_id: 'auth-ops', email: 'ops@cef.example', role: 'ops', assetco_id: null },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
  cef_facilities: [
    { id: 'facility-1', assetco_id: 'GROSOLAR', facility_reference: 'CEF-FA-001', principal_amount_ngn: 1000000, total_repaid_ngn: 0, outstanding_balance_ngn: 1000000, facility_status: 'ACTIVE' },
  ],
  facility_documents: [
    { id: 'doc-expiring', facility_id: 'facility-1', title: 'Insurance Cert', classification: 'Insurance', status: 'EXECUTED', expiry_date: daysFromToday(10) },
    { id: 'doc-expired', facility_id: 'facility-1', title: 'Board Resolution', classification: 'Board Resolution', status: 'EXECUTED', expiry_date: daysFromToday(-5) },
    { id: 'doc-far-out', facility_id: 'facility-1', title: 'Loan Note', classification: 'Loan Note', status: 'EXECUTED', expiry_date: daysFromToday(200) },
    { id: 'doc-no-expiry', facility_id: 'facility-1', title: 'Board Resolution 2', classification: 'Board Resolution', status: 'EXECUTED', expiry_date: null },
  ],
  facility_security: [
    { id: 'sec-expiring', facility_id: 'facility-1', security_type: 'All-Assets Debenture', insurance_expiry_date: daysFromToday(15) },
  ],
  facility_covenants: [
    { id: 'cov-overdue', facility_id: 'facility-1', covenant_description: 'Maintain DSCR > 1.25x', covenant_type: 'FINANCIAL', compliance_status: 'PENDING', next_test_due_date: daysFromToday(-2) },
  ],
});

jest.mock('../src/config/supabase', () => mockSupabase);

const { checkFacilityExpiries } = require('../src/services/facilityExpiryAlertService');

describe('checkFacilityExpiries', () => {
  it('flags expiring/expired documents, expiring insurance, and an overdue covenant test — once each', async () => {
    const first = await checkFacilityExpiries();
    expect(first.documentsExpiring).toBe(1);
    expect(first.documentsExpired).toBe(1);
    expect(first.securityExpiring).toBe(1);
    expect(first.covenantsOverdue).toBe(1);

    const expiredDoc = mockSupabase._store.facility_documents.find((d) => d.id === 'doc-expired');
    expect(expiredDoc.status).toBe('EXPIRED');

    const alertTypes = mockSupabase._store.alerts.map((a) => a.alert_type);
    expect(alertTypes).toEqual(
      expect.arrayContaining([
        'FACILITY_DOCUMENT_EXPIRING',
        'FACILITY_DOCUMENT_EXPIRED',
        'FACILITY_SECURITY_INSURANCE_EXPIRING',
        'FACILITY_COVENANT_TEST_OVERDUE',
      ])
    );

    const notificationRecipientEmails = mockSupabase._store.notification_recipients
      .map((r) => mockSupabase._store.users.find((u) => u.id === r.user_id)?.email);
    expect(notificationRecipientEmails).toEqual(
      expect.arrayContaining(['mgmt@cef.example', 'risk@cef.example', 'finance@cef.example'])
    );
    expect(notificationRecipientEmails).not.toContain('ops@cef.example');

    // Running it again should not re-alert on the same conditions.
    const second = await checkFacilityExpiries();
    expect(second.documentsExpiring).toBe(0);
    expect(second.documentsExpired).toBe(0);
    expect(second.securityExpiring).toBe(0);
    expect(second.covenantsOverdue).toBe(0);
  });
});
