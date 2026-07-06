const { createFakeSupabase } = require('./testUtils/fakeSupabase');

const mockSupabase = createFakeSupabase({
  assetcos: [
    {
      id: 'DEMOSOLAR',
      hmac_secret: 'test-secret',
      is_active: true,
      base_url: 'https://demosolar.example.com',
      reconciliation_token: 'demo-token',
    },
  ],
  assets: [{ id: 'GS-1001', assetco_id: 'DEMOSOLAR', status: 'deployed' }],
  payments: [{ assetco_id: 'DEMOSOLAR', source_ref: 'TXN-1' }],
  faults: [{ assetco_id: 'DEMOSOLAR', asset_id: 'GS-1001', status: 'open' }],
});

jest.mock('../src/config/supabase', () => mockSupabase);

const {
  compareAssets,
  comparePayments,
  compareFaults,
  runReconciliationForAssetCo,
} = require('../src/services/reconciliationService');

describe('reconciliation comparison logic', () => {
  it('compareAssets flags a remote asset missing locally and a status mismatch', () => {
    const local = [
      { id: 'GS-1001', status: 'deployed' },
      { id: 'GS-1002', status: 'deployed' },
    ];
    const remote = [
      { assetId: 'GS-1001', status: 'disabled' },
      { assetId: 'GS-1003', status: 'deployed' },
    ];

    const mismatches = compareAssets(local, remote);
    expect(mismatches).toEqual(
      expect.arrayContaining([
        { type: 'status_mismatch', assetId: 'GS-1001', localStatus: 'deployed', remoteStatus: 'disabled' },
        { type: 'missing_locally', assetId: 'GS-1003' },
      ])
    );
    expect(mismatches).toHaveLength(2);
  });

  it('comparePayments flags a remote payment absent from the local ledger', () => {
    const local = [{ source_ref: 'TXN-1' }];
    const remote = [
      { sourceRef: 'TXN-1', assetId: 'GS-1001' },
      { sourceRef: 'TXN-2', assetId: 'GS-1001' },
    ];

    const mismatches = comparePayments(local, remote);
    expect(mismatches).toEqual([{ type: 'missing_locally', sourceRef: 'TXN-2', assetId: 'GS-1001' }]);
  });

  it('compareFaults flags a remote open fault with no matching local open fault', () => {
    const local = [{ asset_id: 'GS-1001' }];
    const remote = [{ assetId: 'GS-1001' }, { assetId: 'GS-1004' }];

    const mismatches = compareFaults(local, remote);
    expect(mismatches).toEqual([{ type: 'missing_locally', assetId: 'GS-1004' }]);
  });
});

describe('runReconciliationForAssetCo', () => {
  const assetco = mockSupabase._store.assetcos[0];

  afterEach(() => {
    global.fetch.mockRestore?.();
  });

  it('logs OK and updates sync_state when remote matches local exactly', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/cef/assets')) {
        return Promise.resolve({ ok: true, json: async () => [{ assetId: 'GS-1001', status: 'deployed' }] });
      }
      if (url.includes('/cef/payments')) {
        return Promise.resolve({ ok: true, json: async () => [{ sourceRef: 'TXN-1', assetId: 'GS-1001' }] });
      }
      if (url.includes('/cef/faults')) {
        return Promise.resolve({ ok: true, json: async () => [{ assetId: 'GS-1001' }] });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const result = await runReconciliationForAssetCo(assetco);

    expect(result.status).toBe('OK');
    expect(result.mismatches).toHaveLength(0);

    const logEntry = mockSupabase._store.reconciliation_log.at(-1);
    expect(logEntry.status).toBe('OK');

    const sync = mockSupabase._store.sync_state.find((s) => s.assetco_id === 'DEMOSOLAR');
    expect(sync.last_reconciliation_status).toBe('OK');
  });

  it('logs MISMATCH when the remote has a payment CEF-PIP never received', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/cef/assets')) {
        return Promise.resolve({ ok: true, json: async () => [{ assetId: 'GS-1001', status: 'deployed' }] });
      }
      if (url.includes('/cef/payments')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { sourceRef: 'TXN-1', assetId: 'GS-1001' },
            { sourceRef: 'TXN-MISSED', assetId: 'GS-1001' },
          ],
        });
      }
      if (url.includes('/cef/faults')) {
        return Promise.resolve({ ok: true, json: async () => [{ assetId: 'GS-1001' }] });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const result = await runReconciliationForAssetCo(assetco);

    expect(result.status).toBe('MISMATCH');
    expect(result.mismatches).toContainEqual({
      type: 'missing_locally',
      sourceRef: 'TXN-MISSED',
      assetId: 'GS-1001',
    });
  });

  it('logs ERROR when the AssetCo endpoint is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await runReconciliationForAssetCo(assetco);

    expect(result.status).toBe('ERROR');
    const sync = mockSupabase._store.sync_state.find((s) => s.assetco_id === 'DEMOSOLAR');
    expect(sync.last_reconciliation_status).toBe('ERROR');
  });
});
