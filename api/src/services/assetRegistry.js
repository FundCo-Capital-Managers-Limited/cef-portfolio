const supabase = require('../config/supabase');

function syncFields(payload) {
  return {
    updated_at: payload.timestamp,
    last_synced_at: new Date().toISOString(),
    sync_status: 'SYNCED',
  };
}

async function getAsset(assetId) {
  const { data, error } = await supabase.from('assets').select('*').eq('id', assetId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Upserts an asset row, preserving customer_id from the existing row when the
 * incoming event doesn't carry one — asset.deployed/decommissioned events may
 * not repeat the customerId that asset.created already established, and a
 * naive upsert would otherwise null it out.
 */
async function upsertAsset(payload, fields) {
  const existing = await getAsset(payload.assetId);
  const { error } = await supabase.from('assets').upsert(
    {
      id: payload.assetId,
      assetco_id: payload.assetCoId,
      customer_id: payload.customerId || existing?.customer_id || null,
      ...fields,
      ...syncFields(payload),
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

/**
 * customer.created: upsert the authoritative customer record. Payment/fault
 * handlers may have already created a placeholder stub (registryStubs.js) —
 * this overwrites it with real data once the AssetCo actually emits the event.
 */
async function handleCustomerCreated(payload) {
  const { error } = await supabase.from('customers').upsert(
    {
      id: payload.customerId,
      assetco_id: payload.assetCoId,
      name: payload.metadata?.name || null,
      ...syncFields(payload),
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

/**
 * asset.created: a new asset has been registered in the AssetCo system
 * (not yet physically installed — see asset.deployed for that transition).
 */
async function handleAssetCreated(payload) {
  await upsertAsset(payload, { status: 'created' });
}

/**
 * asset.deployed: the asset has been physically installed and commissioned.
 */
async function handleAssetDeployed(payload) {
  await upsertAsset(payload, { status: 'deployed', deployed_at: payload.timestamp });
}

/**
 * asset.decommissioned: the asset has been taken offline or removed from service.
 */
async function handleAssetDecommissioned(payload) {
  await upsertAsset(payload, { status: 'decommissioned' });
}

/**
 * sync.heartbeat: periodic health signal confirming an AssetCo integration is
 * active. Tracked per-AssetCo so the dashboard can flag stale integrations.
 */
async function handleSyncHeartbeat(payload) {
  const { error } = await supabase.from('sync_state').upsert(
    {
      assetco_id: payload.assetCoId,
      last_heartbeat_at: payload.timestamp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'assetco_id' }
  );
  if (error) throw error;
}

module.exports = {
  handleCustomerCreated,
  handleAssetCreated,
  handleAssetDeployed,
  handleAssetDecommissioned,
  handleSyncHeartbeat,
};
