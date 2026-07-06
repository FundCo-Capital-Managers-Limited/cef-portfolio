const crypto = require('crypto');
const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const SECRET = 'test-secret';
const mockSupabase = createFakeSupabase({
  assetcos: [{ id: 'DEMOSOLAR', hmac_secret: SECRET, is_active: true }],
});

jest.mock('../src/config/supabase', () => mockSupabase);

const request = require('supertest');
const app = require('../src/app');

function sign(bodyString) {
  return crypto.createHmac('sha256', SECRET).update(bodyString).digest('hex');
}

function postEvent(payload, { assetCoId = 'DEMOSOLAR', signature } = {}) {
  const bodyString = JSON.stringify(payload);
  const sig = signature !== undefined ? signature : sign(bodyString);
  return request(app)
    .post('/api/v1/events')
    .set('Content-Type', 'application/json')
    .set('X-CEF-AssetCo-Id', assetCoId)
    .set('X-CEF-Signature', sig)
    .send(bodyString);
}

describe('POST /api/v1/events', () => {
  const validPayload = {
    eventType: 'payment.received',
    assetCoId: 'DEMOSOLAR',
    assetId: 'GS-1001',
    customerId: 'CUS-0042',
    amount: 75000,
    currency: 'NGN',
    timestamp: '2026-05-26T10:22:00Z',
    sourceRef: 'TXN-84729',
  };

  it('accepts a valid, correctly signed event', async () => {
    const res = await postEvent(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.eventId).toBeTruthy();
  });

  it('rejects a request with an invalid signature', async () => {
    const res = await postEvent(validPayload, { signature: 'deadbeef'.repeat(8) });
    expect(res.status).toBe(401);
  });

  it('rejects a request missing the signature header', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('X-CEF-AssetCo-Id', 'DEMOSOLAR')
      .send(validPayload);
    expect(res.status).toBe(400);
  });

  it('rejects a payload with an invalid eventType', async () => {
    const res = await postEvent({ ...validPayload, eventType: 'not.a.real.event' });
    expect(res.status).toBe(400);
  });

  it('rejects a payment event missing amount', async () => {
    const { amount, ...rest } = validPayload;
    const res = await postEvent(rest);
    expect(res.status).toBe(400);
  });

  it('rejects when payload assetCoId does not match the header', async () => {
    const res = await postEvent({ ...validPayload, assetCoId: 'OTHERCO' });
    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
