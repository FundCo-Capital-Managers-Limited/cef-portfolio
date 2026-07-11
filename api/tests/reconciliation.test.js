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
  isReconciliationDueToday,
  maybeRunReconciliationForAssetCo,
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

describe('lazy per-AssetCo reconciliation trigger (free-tier substitute for a nightly cron job)', () => {
  afterEach(() => {
    global.fetch.mockRestore?.();
    mockSupabase._store.sync_state = mockSupabase._store.sync_state.filter((s) => s.assetco_id !== 'GROSOLAR');
  });

  it('is due when no reconciliation has ever run for the AssetCo', async () => {
    expect(await isReconciliationDueToday('GROSOLAR')).toBe(true);
  });

  it('is not due when the AssetCo already reconciled earlier today', async () => {
    mockSupabase._store.sync_state.push({
      assetco_id: 'GROSOLAR',
      last_reconciliation_at: new Date().toISOString(),
      last_reconciliation_status: 'OK',
    });
    expect(await isReconciliationDueToday('GROSOLAR')).toBe(false);
  });

  it('is due again once the last run was on a previous UTC day', async () => {
    mockSupabase._store.sync_state.push({
      assetco_id: 'GROSOLAR',
      last_reconciliation_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      last_reconciliation_status: 'OK',
    });
    expect(await isReconciliationDueToday('GROSOLAR')).toBe(true);
  });

  it('skips AssetCos with no base_url configured, even if due', async () => {
    mockSupabase._store.assetcos.push({ id: 'GROSOLAR', hmac_secret: 'x', is_active: true, base_url: null });
    const result = await maybeRunReconciliationForAssetCo('GROSOLAR');
    expect(result).toBeNull();
    mockSupabase._store.assetcos = mockSupabase._store.assetcos.filter((a) => a.id !== 'GROSOLAR');
  });

  it('actually runs reconciliation when due and base_url is configured', async () => {
    // Earlier tests in this file already ran reconciliation for DEMOSOLAR
    // today, which would make it look "not due" — clear that first so this
    // test genuinely exercises the "due" path rather than depending on
    // execution order.
    mockSupabase._store.sync_state = mockSupabase._store.sync_state.filter((s) => s.assetco_id !== 'DEMOSOLAR');

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/cef/assets')) return Promise.resolve({ ok: true, json: async () => [] });
      if (url.includes('/cef/payments')) return Promise.resolve({ ok: true, json: async () => [] });
      if (url.includes('/cef/faults')) return Promise.resolve({ ok: true, json: async () => [] });
      throw new Error(`unexpected url ${url}`);
    });

    const result = await maybeRunReconciliationForAssetCo('DEMOSOLAR');
    expect(result.status).toBe('OK');
  });

  it('does nothing when already reconciled today', async () => {
    global.fetch = jest.fn();
    mockSupabase._store.sync_state = mockSupabase._store.sync_state.map((s) =>
      s.assetco_id === 'DEMOSOLAR' ? { ...s, last_reconciliation_at: new Date().toISOString() } : s
    );

    const result = await maybeRunReconciliationForAssetCo('DEMOSOLAR');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
