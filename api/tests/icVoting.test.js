const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-chair', auth_user_id: 'auth-chair', email: 'chair@cef.example', role: 'finance', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-member1', auth_user_id: 'auth-member1', email: 'member1@cef.example', role: 'ops', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-member2', auth_user_id: 'auth-member2', email: 'member2@cef.example', role: 'risk', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-nonmember', auth_user_id: 'auth-nonmember', email: 'nonmember@cef.example', role: 'finance', assetco_id: null, can_access_ic: true, is_active: true },
  ],
  ic_matters: [
    { id: 'matter-1', category: 'NEW_INVESTMENT', decision_type: 'Preliminary approval', title: 'GroSolar Series C', status: 'UNDER_REVIEW' },
    { id: 'matter-2', category: 'POLICY', decision_type: 'Concentration-limit exception', title: 'Solar cap exception', status: 'UNDER_REVIEW' },
  ],
  ic_meetings: [
    { id: 'meeting-1', meeting_date: '2026-08-01T14:00:00Z', status: 'IN_PROGRESS', chair_user_id: 'user-chair', secretary_user_id: null },
  ],
  ic_committee_members: [
    { id: 'cm-1', user_id: 'user-chair', is_chair: true, is_secretary: false, removed_at: null },
    { id: 'cm-2', user_id: 'user-member1', is_chair: false, is_secretary: false, removed_at: null },
    { id: 'cm-3', user_id: 'user-member2', is_chair: false, is_secretary: false, removed_at: null },
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

const BASE = '/api/ic/meetings/meeting-1/matters/matter-1';

describe('IC conflicts, voting, and decisions', () => {
  it('a non-member cannot vote even with IC access', async () => {
    const asNonMember = as('auth-nonmember');
    const res = await asNonMember(request(app).post(`${BASE}/vote`).send({ value: 'APPROVE' }));
    expect(res.status).toBe(403);
  });

  it('active members can vote, and the summary reflects the tally', async () => {
    // Each as(...) call mutates the shared jwtVerifier mock immediately, not
    // lazily — it must be called right before the request it's for, not
    // stored ahead of time, or every request ends up authenticated as
    // whichever identity was set last.
    await as('auth-chair')(request(app).post(`${BASE}/vote`).send({ value: 'APPROVE' }));
    await as('auth-member1')(request(app).post(`${BASE}/vote`).send({ value: 'APPROVE' }));
    await as('auth-member2')(request(app).post(`${BASE}/vote`).send({ value: 'REJECT' }));

    const summaryRes = await as('auth-chair')(request(app).get(`${BASE}/vote-summary`));
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary.votesFor).toBe(2);
    expect(summaryRes.body.summary.votesAgainst).toBe(1);
    expect(summaryRes.body.summary.activeMemberCount).toBe(3);
    expect(summaryRes.body.summary.quorumRequired).toBe(2);
    expect(summaryRes.body.summary.quorumMet).toBe(true);
  });

  it('a vote can be changed by voting again (upsert, not a second vote)', async () => {
    // The previous test already left chair/member1/member2 votes in place
    // (3 total) - re-voting as member2 here should update their existing
    // vote in place, not add a 4th row.
    const before = await as('auth-chair')(request(app).get(`${BASE}/vote-summary`));
    const votesCastBefore = before.body.summary.votesCast;

    await as('auth-member2')(request(app).post(`${BASE}/vote`).send({ value: 'REJECT' }));
    const changeRes = await as('auth-member2')(request(app).post(`${BASE}/vote`).send({ value: 'APPROVE' }));
    expect(changeRes.status).toBe(200);

    const summaryRes = await as('auth-chair')(request(app).get(`${BASE}/vote-summary`));
    expect(summaryRes.body.summary.votesCast).toBe(votesCastBefore);
    const member2Vote = summaryRes.body.summary.votes.find((v) => v.user_id === 'user-member2');
    expect(member2Vote.value).toBe('APPROVE');
  });

  it('declaring a conflict recuses the member, withdraws their vote, and excludes them from eligible voters', async () => {
    const asMember1 = as('auth-member1');
    await asMember1(request(app).post(`${BASE}/vote`).send({ value: 'APPROVE' }));

    const conflictRes = await asMember1(request(app).post(`${BASE}/conflicts`).send({ reason: 'I hold shares in a related sponsor' }));
    expect(conflictRes.status).toBe(201);

    const voteRes = await asMember1(request(app).post(`${BASE}/vote`).send({ value: 'APPROVE' }));
    expect(voteRes.status).toBe(403);

    const asChair = as('auth-chair');
    const summaryRes = await asChair(request(app).get(`${BASE}/vote-summary`));
    expect(summaryRes.body.summary.recusedCount).toBe(1);
    expect(summaryRes.body.summary.eligibleVoterCount).toBe(2);
  });

  it('rejects declaring the same conflict twice', async () => {
    const asMember2 = as('auth-member2');
    await asMember2(request(app).post(`${BASE}/conflicts`).send({ reason: 'x' }));
    const dupRes = await asMember2(request(app).post(`${BASE}/conflicts`).send({ reason: 'x' }));
    expect(dupRes.status).toBe(400);
  });

  it('only the meeting chair/secretary or management/executive/it_admin can record a decision', async () => {
    const asMember1 = as('auth-member1');
    const res = await asMember1(request(app).post(`${BASE}/decision`).send({ outcome: 'APPROVED' }));
    expect(res.status).toBe(403);
  });

  it('the chair can record a decision, which locks the matter status to DECIDED', async () => {
    const asChair = as('auth-chair');
    const res = await asChair(request(app).post(`${BASE}/decision`).send({ outcome: 'APPROVED' }));
    expect(res.status).toBe(201);
    expect(res.body.decision.outcome).toBe('APPROVED');

    const matterRes = await asChair(request(app).get('/api/ic/matters/matter-1'));
    expect(matterRes.body.matter.status).toBe('DECIDED');

    const dupDecisionRes = await asChair(request(app).post(`${BASE}/decision`).send({ outcome: 'DEFERRED' }));
    expect(dupDecisionRes.status).toBe(400);
  });

  it('rejects an invalid decision outcome', async () => {
    const asChair = as('auth-chair');
    const res = await asChair(request(app).post('/api/ic/meetings/meeting-1/matters/matter-2/decision').send({ outcome: 'BOGUS' }));
    expect(res.status).toBe(400);
  });
});
