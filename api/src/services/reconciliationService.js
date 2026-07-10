const supabase = require('../config/supabase');
const { fetchRemoteAssets, fetchRemotePayments, fetchRemoteFaults } = require('./reconciliationClient');
const logger = require('../utils/logger');

function compareAssets(localAssets, remoteAssets) {
  const localById = new Map(localAssets.map((a) => [a.id, a]));
  const mismatches = [];

  for (const remote of remoteAssets) {
    const local = localById.get(remote.assetId);
    if (!local) {
      mismatches.push({ type: 'missing_locally', assetId: remote.assetId });
    } else if (local.status !== remote.status) {
      mismatches.push({
        type: 'status_mismatch',
        assetId: remote.assetId,
        localStatus: local.status,
        remoteStatus: remote.status,
      });
    }
  }
  return mismatches;
}

function comparePayments(localPayments, remotePayments) {
  const localBySourceRef = new Set(localPayments.map((p) => p.source_ref).filter(Boolean));
  return remotePayments
    .filter((p) => p.sourceRef && !localBySourceRef.has(p.sourceRef))
    .map((p) => ({ type: 'missing_locally', sourceRef: p.sourceRef, assetId: p.assetId }));
}

function compareFaults(localOpenFaults, remoteOpenFaults) {
  const localOpenAssetIds = new Set(localOpenFaults.map((f) => f.asset_id));
  return remoteOpenFaults
    .filter((f) => !localOpenAssetIds.has(f.assetId))
    .map((f) => ({ type: 'missing_locally', assetId: f.assetId }));
}

async function logRun(assetCoId, status, details) {
  const { error } = await supabase.from('reconciliation_log').insert({
    assetco_id: assetCoId,
    status,
    details,
  });
  if (error) throw error;

  const { error: syncError } = await supabase.from('sync_state').upsert(
    {
      assetco_id: assetCoId,
      last_reconciliation_at: new Date().toISOString(),
      last_reconciliation_status: status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'assetco_id' }
  );
  if (syncError) throw syncError;
}

/**
 * Pulls the AssetCo's own reconciliation endpoints and compares them against
 * CEF-PIP's local ledger, flagging anything the AssetCo has that we don't —
 * the signal that a webhook was missed or failed to process. Never mutates
 * local data itself (see architecture doc §9: AssetCo platform is
 * authoritative) — it only logs discrepancies for follow-up.
 */
async function runReconciliationForAssetCo(assetco) {
  try {
    const [{ data: localAssets }, { data: localPayments }, { data: localOpenFaults }] = await Promise.all([
      supabase.from('assets').select('id, status').eq('assetco_id', assetco.id),
      supabase.from('payments').select('source_ref').eq('assetco_id', assetco.id),
      supabase.from('faults').select('asset_id').eq('assetco_id', assetco.id).eq('status', 'open'),
    ]);

    const [remoteAssets, remotePayments, remoteOpenFaults] = await Promise.all([
      fetchRemoteAssets(assetco),
      fetchRemotePayments(assetco),
      fetchRemoteFaults(assetco, { status: 'open' }),
    ]);

    const mismatches = [
      ...compareAssets(localAssets || [], remoteAssets),
      ...comparePayments(localPayments || [], remotePayments),
      ...compareFaults(localOpenFaults || [], remoteOpenFaults),
    ];

    const status = mismatches.length > 0 ? 'MISMATCH' : 'OK';
    await logRun(assetco.id, status, { mismatches });
    logger.info('Reconciliation run complete', { assetCoId: assetco.id, status, mismatchCount: mismatches.length });
    return { assetCoId: assetco.id, status, mismatches };
  } catch (err) {
    await logRun(assetco.id, 'ERROR', { message: err.message });
    logger.error('Reconciliation run failed', { assetCoId: assetco.id, error: err.message });
    return { assetCoId: assetco.id, status: 'ERROR', message: err.message };
  }
}

/**
 * Runs reconciliation for every active AssetCo that has a base_url configured.
 * AssetCos without one (nothing to call yet) are silently skipped rather than
 * logged as errors — this is expected during early onboarding.
 */
async function runNightlyReconciliation() {
  const { data: assetcos, error } = await supabase
    .from('assetcos')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;

  const eligible = (assetcos || []).filter((a) => a.base_url);
  logger.info('Nightly reconciliation starting', { assetCoCount: eligible.length });

  const results = [];
  for (const assetco of eligible) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runReconciliationForAssetCo(assetco));
  }
  return results;
}

module.exports = { runReconciliationForAssetCo, runNightlyReconciliation, compareAssets, comparePayments, compareFaults };
