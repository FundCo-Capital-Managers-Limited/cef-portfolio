const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  users: [
    { id: 'user-mgmt', auth_user_id: 'auth-mgmt', email: 'mgmt@cef.example', name: 'Mgmt Person', role: 'management', assetco_id: null, can_access_ic: false, is_active: true },
    { id: 'user-finance-only', auth_user_id: 'auth-finance-only', email: 'finance-only@cef.example', role: 'finance', assetco_id: null, can_access_ic: false, is_active: true },
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

describe('IC outbound email', () => {
  it('sends an email from the verified domain, CC-ing and reply-to-ing the sender', async () => {
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/email').send({
        matterId: 'matter-1',
        toEmails: ['sponsor@example.com'],
        subject: 'Conditions precedent for GroSolar Series C',
        body: 'Please find attached the list of conditions precedent for closing.',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.email.sender_email).toBe('mgmt@cef.example');
    expect(res.body.email.sender_name).toBe('Mgmt Person');
    expect(res.body.email.cc_emails).toEqual(['mgmt@cef.example']);
    expect(res.body.email.to_emails).toEqual(['sponsor@example.com']);
    expect(res.body.email.send_error).toBeNull();
  });

  it('records a matter-linked email and it shows up filtered by matter', async () => {
    const listRes = await as('auth-mgmt')(request(app).get('/api/ic/email?matterId=matter-1'));
    expect(listRes.status).toBe(200);
    expect(listRes.body.emails.length).toBeGreaterThan(0);
    expect(listRes.body.emails.every((e) => e.matter_id === 'matter-1')).toBe(true);
  });

  it('rejects sending with no recipients', async () => {
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/email').send({ toEmails: [], subject: 'x', body: 'y' })
    );
    expect(res.status).toBe(400);
  });

  it('rejects sending with no subject or body', async () => {
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/email').send({ toEmails: ['a@example.com'], subject: '', body: '' })
    );
    expect(res.status).toBe(400);
  });

  it('rejects a user without can_access_ic', async () => {
    const res = await as('auth-finance-only')(
      request(app).post('/api/ic/email').send({ toEmails: ['a@example.com'], subject: 'x', body: 'y' })
    );
    expect(res.status).toBe(403);
  });
});

describe('IC outbound email — dev recipient allowlist', () => {
  const originalAllowlist = require('../src/config/env').icEmailAllowedRecipients;

  afterEach(() => {
    require('../src/config/env').icEmailAllowedRecipients = originalAllowlist;
  });

  it('blocks sending to a recipient outside the configured test allowlist', async () => {
    require('../src/config/env').icEmailAllowedRecipients = ['allowed@example.com'];
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/email').send({ toEmails: ['not-allowed@example.com'], subject: 'x', body: 'y' })
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('not-allowed@example.com');
  });

  it('allows sending to a recipient on the allowlist', async () => {
    require('../src/config/env').icEmailAllowedRecipients = ['allowed@example.com'];
    const res = await as('auth-mgmt')(
      request(app).post('/api/ic/email').send({ toEmails: ['allowed@example.com'], subject: 'x', body: 'y' })
    );
    expect(res.status).toBe(201);
  });
});
