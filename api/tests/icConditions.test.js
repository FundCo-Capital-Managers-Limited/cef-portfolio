const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', role: 'management', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-owner', auth_user_id: 'auth-owner', email: 'owner@cef.example', role: 'finance', assetco_id: null, can_access_ic: true, is_active: true },
    { id: 'user-finance-only', auth_user_id: 'auth-finance-only', email: 'finance-only@cef.example', role: 'finance', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-owner2', auth_user_id: 'auth-owner2', email: 'owner2@cef.example', role: 'ops', assetco_id: null, can_access_ic: true, is_active: true },
  ],
  ic_matters: [
    { id: 'matter-1', category: 'NEW_INVESTMENT', decision_type: 'Final investment approval', title: 'GroSolar Series C', status: 'DECIDED' },
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

describe('IC Conditions and actions', () => {
  it('creates a condition on a matter, assigns an owner, and notifies them', async () => {
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/matters/matter-1/conditions').send({
        type: 'CP_TO_FIRST_DRAWDOWN',
        wording: 'Execute the REA grant assignment before first drawdown.',
        ownerUserId: 'user-owner',
        dueDate: '2026-08-15',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.condition.status).toBe('OPEN');

    const notification = mockSupabase._store.notifications.find((n) => n.type === 'ic_condition_assigned');
    expect(notification).toBeTruthy();
    expect(notification.ic_matter_id).toBe('matter-1');

    const recipients = mockSupabase._store.notification_recipients.filter((r) => r.notification_id === notification.id);
    expect(recipients).toHaveLength(1);
  });

  it('lists conditions for a matter', async () => {
    const listRes = await as('auth-mgmt')(request(app).get('/api/ic/matters/matter-1/conditions'));
    expect(listRes.status).toBe(200);
    expect(listRes.body.conditions.length).toBeGreaterThan(0);
  });

  it('404s creating a condition on an unknown matter', async () => {
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/matters/no-such-matter/conditions').send({ type: 'COVENANT', wording: 'x' })
    );
    expect(res.status).toBe(404);
  });

  it('rejects an invalid condition type', async () => {
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/matters/matter-1/conditions').send({ type: 'BOGUS', wording: 'x' })
    );
    expect(res.status).toBe(400);
  });

  it('updates condition status, and re-notifies only when ownership actually changes', async () => {
    const createRes = await as('auth-mgmt')(
      request(app).post('/api/ic/matters/matter-1/conditions').send({ type: 'COVENANT', wording: 'Maintain DSCR > 1.25x', ownerUserId: 'user-owner' })
    );
    const conditionId = createRes.body.condition.id;
    const notificationsBefore = mockSupabase._store.notifications.length;

    const statusRes = await as('auth-mgmt')(request(app).patch(`/api/ic/conditions/${conditionId}`).send({ status: 'UNDER_REVIEW' }));
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.condition.status).toBe('UNDER_REVIEW');
    expect(mockSupabase._store.notifications.length).toBe(notificationsBefore);

    const reassignRes = await as('auth-mgmt')(request(app).patch(`/api/ic/conditions/${conditionId}`).send({ ownerUserId: 'user-owner2' }));
    expect(reassignRes.status).toBe(200);
    expect(mockSupabase._store.notifications.length).toBe(notificationsBefore + 1);
  });

  it('rejects an invalid status', async () => {
    const createRes = await as('auth-mgmt')(
      request(app).post('/api/ic/matters/matter-1/conditions').send({ type: 'IC_ACTION', wording: 'Follow up with legal' })
    );
    const conditionId = createRes.body.condition.id;

    const res = await as('auth-mgmt')(request(app).patch(`/api/ic/conditions/${conditionId}`).send({ status: 'BOGUS' }));
    expect(res.status).toBe(400);
  });

  it('rejects a user without can_access_ic', async () => {
    const res = await as('auth-finance-only')(request(app).get('/api/ic/matters/matter-1/conditions'));
    expect(res.status).toBe(403);
  });
});
