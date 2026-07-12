const supabase = require('../config/supabase');
const logger = require('../utils/logger');

// Matches the fixed IDs sample-assetco-integration/payloads.js always uses
// (CUS-SAMPLE-0001, AST-SAMPLE-0001) — scoping the wipe to this prefix,
// AND to the requesting AssetCo's own ID (enforced by verifyHmac having
// already authenticated the caller as that specific AssetCo), means this
// endpoint can never touch anything but the sandbox's own sample data,
// no matter who calls it.
const SAMPLE_CUSTOMER_PREFIX = 'CUS-SAMPLE-%';
const SAMPLE_ASSET_PREFIX = 'AST-SAMPLE-%';

// Deletes in FK-safe order (children before the parents they reference) and
// throws on the first failure — a silently-swallowed error here previously
// left orphaned rows in place while looking like it had cleaned up (the
// asset was never actually deleted, which meant its customer's delete
// silently failed too on the FK it still held).
async function deleteWhere(table, filters) {
  let query = supabase.from(table).delete();
  for (const [col, op, val] of filters) {
    query = op === 'like' ? query.like(col, val) : query.eq(col, val);
  }
  const { error } = await query;
  if (error) throw Object.assign(new Error(`Sandbox reset failed deleting from ${table}: ${error.message}`), { cause: error });
}

async function resetSandboxData(assetCoId) {
  await deleteWhere('payments', [['assetco_id', 'eq', assetCoId], ['asset_id', 'like', SAMPLE_ASSET_PREFIX]]);
  await deleteWhere('faults', [['assetco_id', 'eq', assetCoId], ['asset_id', 'like', SAMPLE_ASSET_PREFIX]]);
  await deleteWhere('cashflow_state', [['assetco_id', 'eq', assetCoId], ['asset_id', 'like', SAMPLE_ASSET_PREFIX]]);
  // alerts.event_id references events(id) — must go before events, same reason
  // payments/faults have to go before assets/customers.
  await deleteWhere('alerts', [['assetco_id', 'eq', assetCoId], ['asset_id', 'like', SAMPLE_ASSET_PREFIX]]);
  await deleteWhere('events', [['assetco_id', 'eq', assetCoId], ['asset_id', 'like', SAMPLE_ASSET_PREFIX]]);
  await deleteWhere('assets', [['assetco_id', 'eq', assetCoId], ['id', 'like', SAMPLE_ASSET_PREFIX]]);
  await deleteWhere('customers', [['assetco_id', 'eq', assetCoId], ['id', 'like', SAMPLE_CUSTOMER_PREFIX]]);

  logger.info('Sandbox sample data wiped', { assetCoId });
}

module.exports = { resetSandboxData };
