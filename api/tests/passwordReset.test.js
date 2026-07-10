const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({});
jest.mock('../src/config/supabase', () => mockSupabase);

const mockSend = jest.fn().mockResolvedValue({ data: {}, error: null });
jest.mock('../src/config/resend', () => ({ emails: { send: (...args) => mockSend(...args) } }));

const request = require('supertest');

describe('POST /api/auth/forgot-password', () => {
  afterEach(() => {
    mockSend.mockClear();
    jest.resetModules();
    delete process.env.PASSWORD_RESET_ALLOWED_RECIPIENTS;
  });

  it('sends via Resend when no allowlist is configured', async () => {
    delete process.env.PASSWORD_RESET_ALLOWED_RECIPIENTS;
    jest.resetModules();
    const app = require('../src/app');

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'it@fundco.ng' });
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].to).toBe('it@fundco.ng');
  });

  it('skips sending to recipients outside the configured allowlist', async () => {
    process.env.PASSWORD_RESET_ALLOWED_RECIPIENTS = 'it@fundco.ng';
    jest.resetModules();
    const app = require('../src/app');

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'management@fundco.ng' });
    expect(res.status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends to recipients on the allowlist', async () => {
    process.env.PASSWORD_RESET_ALLOWED_RECIPIENTS = 'it@fundco.ng';
    jest.resetModules();
    const app = require('../src/app');

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'it@fundco.ng' });
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
