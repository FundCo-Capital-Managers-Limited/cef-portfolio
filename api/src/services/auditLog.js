const supabase = require('../config/supabase');

/**
 * Records one audit trail entry. This is the single source of truth the
 * in-app notification feed reads from — every mutation a dashboard user or
 * an AssetCo's API integration makes to CEF-PIP-managed records should call
 * this, so "what changed recently" is always complete.
 */
async function recordAudit({ actorType, actorUserId, actorAssetcoId, action, entityType, entityId, details }) {
  const { error } = await supabase.from('audit_log').insert({
    actor_type: actorType,
    actor_user_id: actorUserId || null,
    actor_assetco_id: actorAssetcoId || null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details || null,
  });
  if (error) throw error;
}

module.exports = { recordAudit };
