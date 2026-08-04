const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null },
    { id: 'user-risk', auth_user_id: 'auth-risk', email: 'risk@cef.example', role: 'risk', assetco_id: null },
    { id: 'user-admin-grosolar', auth_user_id: 'auth-admin-grosolar', email: 'admin@grosolar.example.com', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
    { id: 'user-admin-eml', auth_user_id: 'auth-admin-eml', email: 'admin@eml.example.com', role: 'assetco_admin', assetco_id: 'EML' },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null },
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

describe('Facility documents (Module A)', () => {
  it('the facility\'s own AssetCo admin can add a document', async () => {
    const res = await as('auth-admin-grosolar')(
      request(app).post('/api/facilities/facility-1/documents').send({ title: 'Executed Loan Note', classification: 'Loan Note Agreement' })
    );
    expect(res.status).toBe(201);
    expect(res.body.document.status).toBe('DRAFT');
  });

  it('a different AssetCo\'s admin cannot add a document to this facility', async () => {
    const res = await as('auth-admin-eml')(
      request(app).post('/api/facilities/facility-1/documents').send({ title: 'x', classification: 'y' })
    );
    expect(res.status).toBe(403);
  });

  it('confirming an upload requires a SharePoint URL first', async () => {
    const createRes = await as('auth-risk')(
      request(app).post('/api/facilities/facility-1/documents').send({ title: 'Board Resolution', classification: 'Board Resolution' })
    );
    const docId = createRes.body.document.id;

    const confirmRes = await as('auth-risk')(request(app).post(`/api/facilities/documents/${docId}/confirm`));
    expect(confirmRes.status).toBe(400);

    await as('auth-risk')(request(app).patch(`/api/facilities/documents/${docId}`).send({ sharepointUrl: 'https://fundco.sharepoint.com/x' }));
    const confirmRes2 = await as('auth-risk')(request(app).post(`/api/facilities/documents/${docId}/confirm`));
    expect(confirmRes2.status).toBe(200);
    expect(confirmRes2.body.document.confirmed_by_email).toBe('risk@cef.example');
  });

  it('a different AssetCo\'s admin cannot confirm a document belonging to this facility', async () => {
    const createRes = await as('auth-mgmt')(
      request(app).post('/api/facilities/facility-1/documents').send({ title: 'x', classification: 'y', sharepointUrl: 'https://fundco.sharepoint.com/y' })
    );
    const docId = createRes.body.document.id;

    const res = await as('auth-admin-eml')(request(app).post(`/api/facilities/documents/${docId}/confirm`));
    expect(res.status).toBe(403);
  });
});

describe('Facility security (Module B)', () => {
  it('adds and lists a security record', async () => {
    const addRes = await as('auth-mgmt')(
      request(app).post('/api/facilities/facility-1/security').send({
        securityType: 'All-Assets Fixed & Floating Debenture',
        valueNgn: 500000000,
        perfectionStatus: 'Pending Upstamping',
        insuranceStatus: 'Sighted Asset Policy - Needs Renewal',
      })
    );
    expect(addRes.status).toBe(201);

    const listRes = await as('auth-exec')(request(app).get('/api/facilities/facility-1/security'));
    expect(listRes.status).toBe(200);
    expect(listRes.body.security.length).toBeGreaterThan(0);
  });
});

describe('Facility covenants (Module E)', () => {
  it('adds a covenant, defaulting to PENDING compliance, and updates its status', async () => {
    const addRes = await as('auth-risk')(
      request(app).post('/api/facilities/facility-1/covenants').send({
        covenantDescription: 'Maintain DSCR > 1.25x',
        covenantType: 'FINANCIAL',
        frequency: 'Bi-Annual',
      })
    );
    expect(addRes.status).toBe(201);
    expect(addRes.body.covenant.compliance_status).toBe('PENDING');
    const covenantId = addRes.body.covenant.id;

    const updateRes = await as('auth-risk')(
      request(app).patch(`/api/facilities/covenants/${covenantId}`).send({ complianceStatus: 'NON_COMPLIANT' })
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.covenant.compliance_status).toBe('NON_COMPLIANT');
  });

  it('rejects an invalid covenant type', async () => {
    const res = await as('auth-mgmt')(
      request(app).post('/api/facilities/facility-1/covenants').send({ covenantDescription: 'x', covenantType: 'BOGUS' })
    );
    expect(res.status).toBe(400);
  });
});
