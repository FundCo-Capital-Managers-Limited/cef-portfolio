const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false },
  ],
  ic_matters: [
    { id: 'matter-1', category: 'NEW_INVESTMENT', decision_type: 'x', title: 'GroSolar Series C', status: 'OPEN' },
  ],
  ic_conditions: [
    { id: 'cond-open', matter_id: 'matter-1', type: 'COVENANT', wording: 'DSCR test', status: 'OPEN', due_date: '2026-09-01' },
    { id: 'cond-satisfied', matter_id: 'matter-1', type: 'COVENANT', wording: 'Board resolution sighted', status: 'SATISFIED', due_date: '2026-01-01' },
  ],
  ic_meetings: [
    { id: 'meeting-done-no-minutes', meeting_date: '2026-07-01T00:00:00Z', status: 'COMPLETED' },
    { id: 'meeting-done-locked', meeting_date: '2026-06-01T00:00:00Z', status: 'COMPLETED' },
    { id: 'meeting-scheduled', meeting_date: '2026-09-01T00:00:00Z', status: 'SCHEDULED' },
  ],
  ic_minutes: [{ id: 'minutes-1', meeting_id: 'meeting-done-locked', status: 'LOCKED' }],
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

describe('IC secretariat dashboard', () => {
  it('lists only open conditions, with the matter title attached, and flags completed meetings missing locked minutes', async () => {
    const res = await as('auth-mgmt')(request(app).get('/api/ic/secretariat'));
    expect(res.status).toBe(200);

    expect(res.body.openConditions).toHaveLength(1);
    expect(res.body.openConditions[0].id).toBe('cond-open');
    expect(res.body.openConditions[0].matter_title).toBe('GroSolar Series C');

    expect(res.body.meetingsNeedingMinutes.map((m) => m.id)).toEqual(['meeting-done-no-minutes']);
    expect(res.body.meetings).toHaveLength(3);
  });
});
