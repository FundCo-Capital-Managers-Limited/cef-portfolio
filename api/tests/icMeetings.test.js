const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false },
    { id: 'user-finance', auth_user_id: 'auth-finance', email: 'finance@cef.example', role: 'finance', assetco_id: null, can_access_ic: false },
  ],
  assetcos: [{ id: 'GROSOLAR', name: 'GroSolar', hmac_secret: 'secret', is_active: true }],
  ic_matters: [
    { id: 'matter-1', category: 'NEW_INVESTMENT', decision_type: 'Preliminary approval', title: 'GroSolar Series C', assetco_id: 'GROSOLAR', status: 'OPEN' },
    { id: 'matter-2', category: 'POLICY', decision_type: 'Concentration-limit exception', title: 'Solar cap exception', status: 'OPEN' },
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

describe('IC Meetings and agenda', () => {
  it('creates a meeting, adds matters to its agenda, and returns them on get', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(
      request(app).post('/api/ic/meetings').send({
        meetingDate: '2026-08-01T14:00:00Z',
        teamsLink: 'https://teams.microsoft.com/l/meetup-join/ic-standing-meeting',
      })
    );
    expect(createRes.status).toBe(201);
    const meetingId = createRes.body.meeting.id;

    const addItem1 = await asMgmt(request(app).post(`/api/ic/meetings/${meetingId}/agenda`).send({ matterId: 'matter-1' }));
    expect(addItem1.status).toBe(201);
    const addItem2 = await asMgmt(request(app).post(`/api/ic/meetings/${meetingId}/agenda`).send({ matterId: 'matter-2', notes: 'Discuss after item 1' }));
    expect(addItem2.status).toBe(201);

    const getRes = await asMgmt(request(app).get(`/api/ic/meetings/${meetingId}`));
    expect(getRes.status).toBe(200);
    expect(getRes.body.meeting.agendaItems).toHaveLength(2);
    expect(getRes.body.meeting.agendaItems[0].matter.title).toBe('GroSolar Series C');
    expect(getRes.body.meeting.agendaItems[1].notes).toBe('Discuss after item 1');
  });

  it('pre-fills the default Teams link from the most recently created meeting', async () => {
    const asMgmt = as('auth-mgmt');
    const linkRes = await asMgmt(request(app).get('/api/ic/meetings/default-teams-link'));
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.teamsLink).toBe('https://teams.microsoft.com/l/meetup-join/ic-standing-meeting');
  });

  it('rejects adding the same matter to a meeting agenda twice', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(request(app).post('/api/ic/meetings').send({ meetingDate: '2026-09-01T14:00:00Z' }));
    const meetingId = createRes.body.meeting.id;

    await asMgmt(request(app).post(`/api/ic/meetings/${meetingId}/agenda`).send({ matterId: 'matter-1' }));
    const dupRes = await asMgmt(request(app).post(`/api/ic/meetings/${meetingId}/agenda`).send({ matterId: 'matter-1' }));
    expect(dupRes.status).toBe(400);
  });

  it('removes an agenda item', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(request(app).post('/api/ic/meetings').send({ meetingDate: '2026-10-01T14:00:00Z' }));
    const meetingId = createRes.body.meeting.id;
    const addRes = await asMgmt(request(app).post(`/api/ic/meetings/${meetingId}/agenda`).send({ matterId: 'matter-2' }));
    const itemId = addRes.body.item.id;

    const removeRes = await asMgmt(request(app).delete(`/api/ic/meetings/${meetingId}/agenda/${itemId}`));
    expect(removeRes.status).toBe(204);

    const getRes = await asMgmt(request(app).get(`/api/ic/meetings/${meetingId}`));
    expect(getRes.body.meeting.agendaItems).toHaveLength(0);
  });

  it('updates meeting status', async () => {
    const asMgmt = as('auth-mgmt');
    const createRes = await asMgmt(request(app).post('/api/ic/meetings').send({ meetingDate: '2026-11-01T14:00:00Z' }));
    const meetingId = createRes.body.meeting.id;

    const updateRes = await asMgmt(request(app).patch(`/api/ic/meetings/${meetingId}`).send({ status: 'IN_PROGRESS' }));
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.meeting.status).toBe('IN_PROGRESS');
  });

  it('rejects a finance user without can_access_ic', async () => {
    const asFinance = as('auth-finance');
    const res = await asFinance(request(app).get('/api/ic/meetings'));
    expect(res.status).toBe(403);
  });
});
