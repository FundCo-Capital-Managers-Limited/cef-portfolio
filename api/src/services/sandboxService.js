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

async function resetSandboxData(assetCoId) {
  await supabase.from('payments').delete().eq('assetco_id', assetCoId).like('asset_id', SAMPLE_ASSET_PREFIX);
  await supabase.from('faults').delete().eq('assetco_id', assetCoId).like('asset_id', SAMPLE_ASSET_PREFIX);
  await supabase.from('cashflow_state').delete().eq('assetco_id', assetCoId).like('asset_id', SAMPLE_ASSET_PREFIX);
  await supabase.from('events').delete().eq('assetco_id', assetCoId).like('asset_id', SAMPLE_ASSET_PREFIX);
  await supabase.from('assets').delete().eq('assetco_id', assetCoId).like('id', SAMPLE_ASSET_PREFIX);
  await supabase.from('customers').delete().eq('assetco_id', assetCoId).like('id', SAMPLE_CUSTOMER_PREFIX);

  logger.info('Sandbox sample data wiped', { assetCoId });
}

module.exports = { resetSandboxData };
