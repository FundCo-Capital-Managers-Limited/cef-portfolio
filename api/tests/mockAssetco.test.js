const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  assets: [
    { id: 'GS-1001', assetco_id: 'DEMOSOLAR', customer_id: 'CUS-0001', status: 'deployed', deployed_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 'GS-1002', assetco_id: 'OTHERCO', customer_id: 'CUS-9999', status: 'deployed' },
  ],
  payments: [
    { asset_id: 'GS-1001', assetco_id: 'DEMOSOLAR', customer_id: 'CUS-0001', amount: 50000, currency: 'NGN', status: 'received', source_ref: 'TXN-1', occurred_at: '2026-02-01T00:00:00Z' },
  ],
  faults: [
    { asset_id: 'GS-1001', assetco_id: 'DEMOSOLAR', status: 'open', detected_at: '2026-03-01T00:00:00Z', resolved_at: null },
    { asset_id: 'GS-1001', assetco_id: 'DEMOSOLAR', status: 'resolved', detected_at: '2026-01-15T00:00:00Z', resolved_at: '2026-01-16T00:00:00Z' },
  ],
});

jest.mock('../src/config/supabase', () => mockSupabase);

const request = require('supertest');
const app = require('../src/app');

describe('Mock AssetCo reconciliation endpoints', () => {
  it('GET /mock-assetco/:assetCoId/cef/assets returns only that AssetCo\'s assets, remapped', async () => {
    const res = await request(app).get('/mock-assetco/DEMOSOLAR/cef/assets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { assetId: 'GS-1001', customerId: 'CUS-0001', status: 'deployed', deployedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ]);
  });

  it('GET /mock-assetco/:assetCoId/cef/payments remaps payment fields', async () => {
    const res = await request(app).get('/mock-assetco/DEMOSOLAR/cef/payments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { assetId: 'GS-1001', customerId: 'CUS-0001', amount: 50000, currency: 'NGN', status: 'received', sourceRef: 'TXN-1', occurredAt: '2026-02-01T00:00:00Z' },
    ]);
  });

  it('GET /mock-assetco/:assetCoId/cef/faults?status=open filters to open faults only', async () => {
    const res = await request(app).get('/mock-assetco/DEMOSOLAR/cef/faults?status=open');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { assetId: 'GS-1001', status: 'open', detectedAt: '2026-03-01T00:00:00Z', resolvedAt: null },
    ]);
  });
});
