const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false },
    { id: 'user-admin-eml', auth_user_id: 'auth-admin-eml', email: 'admin@eml.example', role: 'assetco_admin', assetco_id: 'EML' },
    { id: 'user-admin-grosolar', auth_user_id: 'auth-admin-grosolar', email: 'admin@grosolar.example', role: 'assetco_admin', assetco_id: 'GROSOLAR' },
    { id: 'user-board', auth_user_id: 'auth-board', email: 'board1@cef.example', role: 'board_member', assetco_id: null, can_access_ic: false },
  ],
  assetcos: [
    { id: 'EML', name: 'EML', hmac_secret: 'secret', is_active: true },
    { id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret2', is_active: true },
  ],
  ic_matters: [
    { id: 'matter-eml', category: 'DISBURSEMENT', decision_type: 'Tranche release', title: 'EML Tranche 2', assetco_id: 'EML', status: 'OPEN' },
    { id: 'matter-general', category: 'POLICY', decision_type: 'x', title: 'Investment policy amendment', assetco_id: null, status: 'OPEN' },
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

describe('AssetCo data-room contribution', () => {
  it('lists only the AssetCo\'s own matters, not the full IC register', async () => {
    const res = await as('auth-admin-eml')(request(app).get('/api/assetco-data-room/matters'));
    expect(res.status).toBe(200);
    expect(res.body.matters).toHaveLength(1);
    expect(res.body.matters[0].id).toBe('matter-eml');
  });

  it('lets the AssetCo rep submit a document, landing at DRAFT (not visible to IC yet)', async () => {
    const res = await as('auth-admin-eml')(
      request(app).post('/api/assetco-data-room/matters/matter-eml/documents').send({
        title: 'Site progress photos - July',
        classification: 'Progress Evidence',
        sharepointUrl: 'https://eml.sharepoint.com/dataroom/july-photos',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.document.status).toBe('DRAFT');

    const boardRes = await as('auth-board')(request(app).get(`/api/ic/matters/matter-eml/documents`));
    expect(boardRes.status).toBe(200);
    expect(boardRes.body.documents).toHaveLength(0);

    const mgmtRes = await as('auth-mgmt')(request(app).get(`/api/ic/matters/matter-eml/documents`));
    expect(mgmtRes.body.documents).toHaveLength(1);
  });

  it('a different AssetCo\'s admin cannot submit to this matter', async () => {
    const res = await as('auth-admin-grosolar')(
      request(app).post('/api/assetco-data-room/matters/matter-eml/documents').send({ title: 'x', classification: 'y' })
    );
    expect(res.status).toBe(403);
  });

  it('cannot submit to a matter with no AssetCo attached', async () => {
    const res = await as('auth-admin-eml')(
      request(app).post('/api/assetco-data-room/matters/matter-general/documents').send({ title: 'x', classification: 'y' })
    );
    expect(res.status).toBe(403);
  });
});
