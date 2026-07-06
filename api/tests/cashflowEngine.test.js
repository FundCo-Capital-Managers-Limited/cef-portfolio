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

async function sendEvent(payload) {
  const bodyString = JSON.stringify(payload);
  const res = await request(app)
    .post('/api/v1/events')
    .set('Content-Type', 'application/json')
    .set('X-CEF-AssetCo-Id', 'DEMOSOLAR')
    .set('X-CEF-Signature', sign(bodyString))
    .send(bodyString);
  expect(res.status).toBe(200);
  return res.body;
}

const ASSET_ID = 'GS-1001';
const CUSTOMER_ID = 'CUS-0042';

function paymentEvent(eventType, amount, timestamp) {
  return {
    eventType,
    assetCoId: 'DEMOSOLAR',
    assetId: ASSET_ID,
    customerId: CUSTOMER_ID,
    amount,
    currency: 'NGN',
    timestamp,
    sourceRef: `TXN-${timestamp}`,
  };
}

describe('Cashflow + Alert Engine end-to-end sequence', () => {
  it('processes deploy -> payments x3 -> miss -> default -> fault -> resolve correctly', async () => {
    await sendEvent({
      eventType: 'asset.deployed',
      assetCoId: 'DEMOSOLAR',
      assetId: ASSET_ID,
      customerId: CUSTOMER_ID,
      timestamp: '2026-01-01T00:00:00Z',
    });

    await sendEvent(paymentEvent('payment.received', 50000, '2026-02-01T00:00:00Z'));
    await sendEvent(paymentEvent('payment.received', 50000, '2026-03-01T00:00:00Z'));
    await sendEvent(paymentEvent('payment.received', 50000, '2026-04-01T00:00:00Z'));

    let cashflow = mockSupabase._store.cashflow_state.find((c) => c.asset_id === ASSET_ID);
    expect(cashflow.total_collected).toBe(150000);
    expect(cashflow.outstanding_balance).toBe(0);
    expect(cashflow.is_defaulted).toBe(false);

    await sendEvent(paymentEvent('payment.missed', 50000, '2026-05-01T00:00:00Z'));
    cashflow = mockSupabase._store.cashflow_state.find((c) => c.asset_id === ASSET_ID);
    expect(cashflow.missed_count).toBe(1);
    expect(cashflow.outstanding_balance).toBe(50000);
    expect(cashflow.is_defaulted).toBe(false);

    await sendEvent(paymentEvent('payment.defaulted', 50000, '2026-05-15T00:00:00Z'));
    cashflow = mockSupabase._store.cashflow_state.find((c) => c.asset_id === ASSET_ID);
    expect(cashflow.is_defaulted).toBe(true);
    expect(cashflow.defaulted_at).toBe('2026-05-15T00:00:00Z');

    const defaultAlerts = mockSupabase._store.alerts.filter((a) => a.alert_type === 'payment.defaulted');
    expect(defaultAlerts).toHaveLength(1);
    expect(defaultAlerts[0].asset_id).toBe(ASSET_ID);

    await sendEvent({
      eventType: 'asset.fault.detected',
      assetCoId: 'DEMOSOLAR',
      assetId: ASSET_ID,
      timestamp: '2026-05-20T00:00:00Z',
    });

    let faults = mockSupabase._store.faults.filter((f) => f.asset_id === ASSET_ID);
    expect(faults).toHaveLength(1);
    expect(faults[0].status).toBe('open');

    const faultAlerts = mockSupabase._store.alerts.filter((a) => a.alert_type === 'asset.fault.detected');
    expect(faultAlerts).toHaveLength(1);

    await sendEvent({
      eventType: 'asset.fault.resolved',
      assetCoId: 'DEMOSOLAR',
      assetId: ASSET_ID,
      timestamp: '2026-05-22T00:00:00Z',
    });

    faults = mockSupabase._store.faults.filter((f) => f.asset_id === ASSET_ID);
    expect(faults[0].status).toBe('resolved');
    expect(faults[0].resolved_at).toBe('2026-05-22T00:00:00Z');

    const payments = mockSupabase._store.payments.filter((p) => p.asset_id === ASSET_ID);
    expect(payments).toHaveLength(5); // 3 received + 1 missed + 1 defaulted

    const processedEvent = mockSupabase._store.events.find(
      (e) => e.event_type === 'payment.defaulted'
    );
    expect(processedEvent.processed_at).toBeTruthy();
    expect(processedEvent.processing_error).toBeNull();
  });
});
