const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-finance-ic', auth_user_id: 'auth-finance-ic', email: 'finance-ic@cef.example', role: 'finance', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-ops-ic', auth_user_id: 'auth-ops-ic', email: 'ops-ic@cef.example', role: 'ops', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-finance-only', auth_user_id: 'auth-finance-only', email: 'finance-only@cef.example', role: 'finance', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-exec-ic', auth_user_id: 'auth-exec-ic', email: 'exec-ic@cef.example', role: 'executive', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-it-ic', auth_user_id: 'auth-it-ic', email: 'it-ic@cef.example', role: 'it_admin', assetco_id: null, can_access_ic: false, is_active: true },
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

describe('IC Committee roster', () => {
  it('management can add a member (a finance person who is also on the IC)', async () => {
    const asMgmt = as('auth-mgmt');
    const res = await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-finance-ic', isSecretary: true }));
    expect(res.status).toBe(201);
    expect(res.body.member.is_secretary).toBe(true);

    const listRes = await asMgmt(request(app).get('/api/ic/committee'));
    expect(listRes.status).toBe(200);
    expect(listRes.body.members).toHaveLength(1);
    expect(listRes.body.members[0].user.email).toBe('finance-ic@cef.example');
  });

  it('a non-management IC member without the secretary flag cannot add members', async () => {
    const asMgmt = as('auth-mgmt');
    await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-finance-ic', isSecretary: false }));

    const asOps = as('auth-ops-ic');
    const res = await asOps(request(app).post('/api/ic/committee').send({ userId: 'user-ops-ic' }));
    expect(res.status).toBe(403);
  });

  it('a designated secretary (not management/executive/it_admin) can manage the roster', async () => {
    const asMgmt = as('auth-mgmt');
    await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-finance-ic', isSecretary: true }));

    const asSecretary = as('auth-finance-ic');
    const res = await asSecretary(request(app).post('/api/ic/committee').send({ userId: 'user-ops-ic' }));
    expect(res.status).toBe(201);
  });

  it('rejects adding the same user twice while still active', async () => {
    const asMgmt = as('auth-mgmt');
    await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-finance-ic' }));
    const dupRes = await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-finance-ic' }));
    expect(dupRes.status).toBe(400);
  });

  it('removes a member (soft-remove, history kept) and allows re-adding afterward', async () => {
    const asMgmt = as('auth-mgmt');
    const addRes = await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-exec-ic' }));
    expect(addRes.status).toBe(201);
    const memberId = addRes.body.member.id;
    const countBefore = (await asMgmt(request(app).get('/api/ic/committee'))).body.members.length;

    const removeRes = await asMgmt(request(app).delete(`/api/ic/committee/${memberId}`));
    expect(removeRes.status).toBe(204);

    const listRes = await asMgmt(request(app).get('/api/ic/committee'));
    expect(listRes.body.members).toHaveLength(countBefore - 1);

    const readdRes = await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-exec-ic' }));
    expect(readdRes.status).toBe(201);
  });

  it('updates chair/secretary flags on an existing member', async () => {
    const asMgmt = as('auth-mgmt');
    const addRes = await asMgmt(request(app).post('/api/ic/committee').send({ userId: 'user-it-ic' }));
    expect(addRes.status).toBe(201);
    const memberId = addRes.body.member.id;

    const updateRes = await asMgmt(request(app).patch(`/api/ic/committee/${memberId}`).send({ isChair: true }));
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.member.is_chair).toBe(true);
  });

  it('lets a non-management IC user list candidate users (narrower than /api/users)', async () => {
    const asOps = as('auth-ops-ic');
    const res = await asOps(request(app).get('/api/ic/committee/candidates'));
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users[0]).toHaveProperty('email');
  });

  it('rejects a user without can_access_ic entirely', async () => {
    const asFinanceOnly = as('auth-finance-only');
    const res = await asFinanceOnly(request(app).get('/api/ic/committee'));
    expect(res.status).toBe(403);
  });
});
