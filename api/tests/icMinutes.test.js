const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-chair', auth_user_id: 'auth-chair', email: 'chair@cef.example', role: 'finance', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-member', auth_user_id: 'auth-member', email: 'member@cef.example', role: 'ops', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-finance-only', auth_user_id: 'auth-finance-only', email: 'finance-only@cef.example', role: 'finance', assetco_id: null, can_access_ic: false, is_active: true },
  ],
  ic_meetings: [
    { id: 'meeting-1', meeting_date: '2026-08-01T14:00:00Z', status: 'IN_PROGRESS', chair_user_id: 'user-chair', secretary_user_id: null },
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

const BASE = '/api/ic/meetings/meeting-1/minutes';

describe('IC Minutes and resolution lock', () => {
  it('creates a blank draft on first access', async () => {
    const res = await as('auth-member')(request(app).get(BASE));
    expect(res.status).toBe(200);
    expect(res.body.minutes.status).toBe('DRAFT');
    expect(res.body.minutes.content).toBe('');
  });

  it('any IC-access user can edit the draft', async () => {
    const res = await as('auth-member')(request(app).patch(BASE).send({ content: 'The committee reviewed the GroSolar Series C matter...' }));
    expect(res.status).toBe(200);
    expect(res.body.minutes.content).toContain('GroSolar');
  });

  it('moves minutes to UNDER_REVIEW', async () => {
    const res = await as('auth-member')(request(app).patch(BASE).send({ status: 'UNDER_REVIEW' }));
    expect(res.status).toBe(200);
    expect(res.body.minutes.status).toBe('UNDER_REVIEW');
  });

  it('rejects setting status directly to LOCKED via the update endpoint', async () => {
    const res = await as('auth-member')(request(app).patch(BASE).send({ status: 'LOCKED' }));
    expect(res.status).toBe(400);
  });

  it('a non-chair/secretary IC member cannot lock the minutes', async () => {
    const res = await as('auth-member')(request(app).post(`${BASE}/lock`));
    expect(res.status).toBe(403);
  });

  it('the chair can lock the minutes, recording who and when', async () => {
    const res = await as('auth-chair')(request(app).post(`${BASE}/lock`));
    expect(res.status).toBe(200);
    expect(res.body.minutes.status).toBe('LOCKED');
    expect(res.body.minutes.locked_by_email).toBe('chair@cef.example');
    expect(res.body.minutes.locked_at).toBeTruthy();
  });

  it('rejects any further edits once locked', async () => {
    const res = await as('auth-chair')(request(app).patch(BASE).send({ content: 'trying to sneak in a change' }));
    expect(res.status).toBe(400);
  });

  it('rejects locking again once already locked', async () => {
    const res = await as('auth-chair')(request(app).post(`${BASE}/lock`));
    expect(res.status).toBe(400);
  });

  it('rejects a user without can_access_ic', async () => {
    const res = await as('auth-finance-only')(request(app).get(BASE));
    expect(res.status).toBe(403);
  });
});
