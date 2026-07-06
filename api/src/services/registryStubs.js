const supabase = require('../config/supabase');

/**
 * Payment/fault events can arrive before the corresponding asset.created /
 * customer.created events are processed (out-of-order delivery, or the AssetCo
 * only emits payment events during early testing). These stubs satisfy the FK
 * constraints on assets/customers with a minimal placeholder row; the Asset
 * Registry handlers (Week 4) overwrite these with authoritative field values
 * once asset.created/customer.created events arrive.
 */
async function ensureAssetStub(assetCoId, assetId) {
  if (!assetId) return;
  const { error } = await supabase
    .from('assets')
    .upsert({ id: assetId, assetco_id: assetCoId }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

async function ensureCustomerStub(assetCoId, customerId) {
  if (!customerId) return;
  const { error } = await supabase
    .from('customers')
    .upsert({ id: customerId, assetco_id: assetCoId }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

module.exports = { ensureAssetStub, ensureCustomerStub };
