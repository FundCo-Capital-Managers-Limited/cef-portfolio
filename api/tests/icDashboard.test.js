const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-owner', auth_user_id: 'auth-owner', email: 'owner@cef.example', role: 'finance', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-other', auth_user_id: 'auth-other', email: 'other@cef.example', role: 'ops', assetco_id: null, can_access_ic: true, is_active: true },
  ],
  ic_matters: [
    { id: 'matter-open', category: 'NEW_INVESTMENT', decision_type: 'Preliminary approval', title: 'Open matter', status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'matter-closed', category: 'POLICY', decision_type: 'x', title: 'Closed matter', status: 'CLOSED', created_at: new Date().toISOString() },
  ],
  ic_meetings: [
    { id: 'meeting-upcoming', meeting_date: nextWeek, status: 'SCHEDULED' },
    { id: 'meeting-past', meeting_date: '2020-01-01T00:00:00Z', status: 'SCHEDULED' },
    { id: 'meeting-completed', meeting_date: nextWeek, status: 'COMPLETED' },
  ],
  ic_conditions: [
    { id: 'cond-overdue', matter_id: 'matter-open', type: 'COVENANT', wording: 'Overdue one', status: 'OPEN', due_date: yesterday, owner_user_id: 'user-owner' },
    { id: 'cond-future', matter_id: 'matter-open', type: 'COVENANT', wording: 'Not due yet', status: 'OPEN', due_date: nextMonth, owner_user_id: 'user-owner' },
    { id: 'cond-satisfied', matter_id: 'matter-open', type: 'COVENANT', wording: 'Done', status: 'SATISFIED', due_date: yesterday, owner_user_id: 'user-owner' },
    { id: 'cond-other-owner', matter_id: 'matter-open', type: 'COVENANT', wording: 'Someone else\'s', status: 'OPEN', due_date: nextMonth, owner_user_id: 'user-other' },
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

describe('IC dashboard summary', () => {
  it('summarizes open matters, upcoming meetings, overdue conditions, and my conditions', async () => {
    const res = await as('auth-owner')(request(app).get('/api/ic/dashboard'));
    expect(res.status).toBe(200);

    const { summary } = res.body;
    expect(summary.openMattersCount).toBe(1);
    expect(summary.openMatters[0].id).toBe('matter-open');

    expect(summary.upcomingMeetingsCount).toBe(1);
    expect(summary.upcomingMeetings[0].id).toBe('meeting-upcoming');

    expect(summary.overdueConditionsCount).toBe(1);
    expect(summary.overdueConditions[0].id).toBe('cond-overdue');

    // owner has 2 open (non-terminal) conditions: overdue + future, not the satisfied one
    expect(summary.myConditionsCount).toBe(2);
    expect(summary.myConditions.map((c) => c.id).sort()).toEqual(['cond-future', 'cond-overdue']);
  });

  it('scopes myConditions to the requesting user, not everyone\'s', async () => {
    const res = await as('auth-other')(request(app).get('/api/ic/dashboard'));
    expect(res.status).toBe(200);
    expect(res.body.summary.myConditionsCount).toBe(1);
    expect(res.body.summary.myConditions[0].id).toBe('cond-other-owner');
  });
});
