const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false },
    { id: 'user-exec', auth_user_id: 'auth-exec', email: 'exec@cef.example', role: 'executive', assetco_id: null, can_access_ic: false },
    { id: 'user-it', auth_user_id: 'auth-it', email: 'it@cef.example', role: 'it_admin', assetco_id: null, can_access_ic: false },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null, can_access_ic: false },
    { id: 'user-finance-ic', auth_user_id: 'auth-finance-ic', email: 'finance-ic@cef.example', role: 'finance', assetco_id: null, can_access_ic: true },
    { id: 'user-board', auth_user_id: 'auth-board', email: 'board1@cef.example', role: 'board_member', assetco_id: null, can_access_ic: false },
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

describe('IC Matters', () => {
  it('management (auto IC access) can create and list matters', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(
      request(app).post('/api/ic/matters').send({
        category: 'NEW_INVESTMENT',
        decisionType: 'Preliminary approval',
        title: 'GroSolar Series C expansion',
        assetcoId: 'GROSOLAR',
      })
    );
    expect(createRes.status).toBe(201);
    expect(createRes.body.matter.status).toBe('OPEN');
    expect(createRes.body.matter.created_by_email).toBe('mgmt@cef.example');

    const listRes = await asMgmt(request(app).get('/api/ic/matters'));
    expect(listRes.status).toBe(200);
    expect(listRes.body.matters).toHaveLength(1);
  });

  it('a finance user with can_access_ic=true can also create a matter', async () => {
    const asFinanceIc = as('auth-finance-ic');
    const res = await asFinanceIc(
      request(app).post('/api/ic/matters').send({
        category: 'PORTFOLIO_MANAGEMENT',
        decisionType: 'Covenant breach',
        title: 'HNL DSCR breach review',
      })
    );
    expect(res.status).toBe(201);
  });

  it('a finance user without can_access_ic is rejected', async () => {
    const asFinance = as('auth-finance');
    const res = await asFinance(request(app).get('/api/ic/matters'));
    expect(res.status).toBe(403);
  });

  it('a board_member gets IC access automatically, with no can_access_ic flag needed', async () => {
    const asBoard = as('auth-board');
    const res = await asBoard(request(app).get('/api/ic/matters'));
    expect(res.status).toBe(200);
  });

  it('rejects an invalid category', async () => {
    const asExec = as('auth-exec');
    const res = await asExec(
      request(app).post('/api/ic/matters').send({ category: 'BOGUS', decisionType: 'x', title: 'x' })
    );
    expect(res.status).toBe(400);
  });

  it('updates a matter status and records who changed it', async () => {
    const asIt = as('auth-it');
    const createRes = await asIt(
      request(app).post('/api/ic/matters').send({ category: 'POLICY', decisionType: 'Investment-policy amendment', title: 'Raise concentration cap' })
    );
    const matterId = createRes.body.matter.id;

    const updateRes = await asIt(request(app).patch(`/api/ic/matters/${matterId}`).send({ status: 'UNDER_REVIEW' }));
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.matter.status).toBe('UNDER_REVIEW');

    const auditEntry = mockSupabase._store.audit_log.find((a) => a.action === 'IC_MATTER_UPDATED' && a.entity_id === matterId);
    expect(auditEntry).toBeTruthy();
    expect(auditEntry.actor_email).toBe('it@cef.example');
  });

  it('404s on an unknown matter id', async () => {
    const asExec = as('auth-exec');
    const res = await asExec(request(app).get('/api/ic/matters/00000000-0000-0000-0000-000000000000'));
    expect(res.status).toBe(404);
  });
});
