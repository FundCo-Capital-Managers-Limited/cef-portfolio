const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null, can_access_ic: false },
    { id: 'user-board', auth_user_id: 'auth-board', email: 'board1@cef.example', role: 'board_member', assetco_id: null, can_access_ic: false },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
  ic_matters: [
    { id: 'matter-1', category: 'NEW_INVESTMENT', decision_type: 'Preliminary approval', title: 'GroSolar Series C', assetco_id: 'GROSOLAR', status: 'OPEN' },
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

describe('IC Documents (SharePoint reference records)', () => {
  it('adds a document reference to a matter and lists it', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(
      request(app).post('/api/ic/matters/matter-1/documents').send({
        title: 'Executed Board Resolution',
        classification: 'Board Resolution',
        sharepointUrl: 'https://fundco.sharepoint.com/sites/ic-dataroom/matter-1/board-resolution.pdf',
      })
    );
    expect(createRes.status).toBe(201);
    expect(createRes.body.document.status).toBe('DRAFT');
    expect(createRes.body.document.confirmed_at).toBeFalsy();

    const listRes = await asMgmt(request(app).get('/api/ic/matters/matter-1/documents'));
    expect(listRes.status).toBe(200);
    expect(listRes.body.documents).toHaveLength(1);
  });

  it('404s adding a document to an unknown matter', async () => {
    const asMgmt = as('auth-mgmt');
    const res = await asMgmt(
      request(app).post('/api/ic/matters/no-such-matter/documents').send({ title: 'x', classification: 'y' })
    );
    expect(res.status).toBe(404);
  });

  it('rejects confirming an upload with no SharePoint URL set yet', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(
      request(app).post('/api/ic/matters/matter-1/documents').send({ title: 'Draft Deed', classification: 'Debenture Deed' })
    );
    const docId = createRes.body.document.id;

    const confirmRes = await asMgmt(request(app).post(`/api/ic/documents/${docId}/confirm`));
    expect(confirmRes.status).toBe(400);
  });

  it('confirms an upload once the SharePoint URL is set, and records who confirmed it', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(
      request(app).post('/api/ic/matters/matter-1/documents').send({
        title: 'Executed Debenture Deed',
        classification: 'Debenture Deed',
        sharepointUrl: 'https://fundco.sharepoint.com/sites/ic-dataroom/matter-1/debenture.pdf',
      })
    );
    const docId = createRes.body.document.id;

    const confirmRes = await asMgmt(request(app).post(`/api/ic/documents/${docId}/confirm`));
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.document.confirmed_by_email).toBe('mgmt@cef.example');
    expect(confirmRes.body.document.confirmed_at).toBeTruthy();

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'IC_DOCUMENT_UPLOAD_CONFIRMED' && a.entity_id === docId);
    expect(auditEntry).toBeTruthy();
  });

  it('updates a document status', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(
      request(app).post('/api/ic/matters/matter-1/documents').send({ title: 'Insurance Policy', classification: 'Insurance' })
    );
    const docId = createRes.body.document.id;

    const updateRes = await asMgmt(request(app).patch(`/api/ic/documents/${docId}`).send({ status: 'UNDER_REVIEW' }));
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.document.status).toBe('UNDER_REVIEW');
  });

  it('rejects a finance user without can_access_ic', async () => {
    const asFinance = as('auth-finance');
    const res = await asFinance(request(app).get('/api/ic/matters/matter-1/documents'));
    expect(res.status).toBe(403);
  });

  it('a board member only sees APPROVED/EXECUTED documents, not DRAFT ones', async () => {
    const asMgmt = as('auth-mgmt');
    const draftRes = await asMgmt(
      request(app).post('/api/ic/matters/matter-1/documents').send({ title: 'Draft memo', classification: 'Memo' })
    );
    const approvedRes = await asMgmt(
      request(app).post('/api/ic/matters/matter-1/documents').send({ title: 'Approved memo', classification: 'Memo' })
    );
    await asMgmt(request(app).patch(`/api/ic/documents/${approvedRes.body.document.id}`).send({ status: 'APPROVED' }));

    const mgmtList = await asMgmt(request(app).get('/api/ic/matters/matter-1/documents'));
    expect(mgmtList.body.documents.map((d) => d.id)).toEqual(expect.arrayContaining([draftRes.body.document.id, approvedRes.body.document.id]));

    const boardList = await as('auth-board')(request(app).get('/api/ic/matters/matter-1/documents'));
    expect(boardList.status).toBe(200);
    expect(boardList.body.documents.map((d) => d.id)).toEqual([approvedRes.body.document.id]);

    const boardGetDraft = await as('auth-board')(request(app).get(`/api/ic/documents/${draftRes.body.document.id}`));
    expect(boardGetDraft.status).toBe(404);
  });
});
