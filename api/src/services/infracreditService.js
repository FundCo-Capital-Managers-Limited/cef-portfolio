const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');

async function getRelationship(assetCoId) {
  const { data, error } = await supabase
    .from('infracredit_relationships')
    .select('*')
    .eq('assetco_id', assetCoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createRelationship(assetCoId, fields, user) {
  const existing = await getRelationship(assetCoId);
  if (existing) {
    const err = new Error('InfraCredit relationship already exists for this AssetCo — use PUT to update it');
    err.status = 409;
    throw err;
  }

  const { error } = await supabase.from('infracredit_relationships').insert({
    assetco_id: assetCoId,
    ...fields,
    last_updated_by: user.id,
  });
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorAssetcoId: assetCoId,
    action: 'INFRACREDIT_RELATIONSHIP_CREATED',
    entityType: 'infracredit_relationship',
    entityId: assetCoId,
    details: fields,
  });

  return getRelationship(assetCoId);
}

async function updateRelationship(assetCoId, fields, user) {
  const existing = await getRelationship(assetCoId);
  if (!existing) {
    const err = new Error('No InfraCredit relationship exists for this AssetCo — use POST to create it');
    err.status = 404;
    throw err;
  }

  const { error } = await supabase
    .from('infracredit_relationships')
    .update({ ...fields, last_updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('assetco_id', assetCoId);
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorAssetcoId: assetCoId,
    action: 'INFRACREDIT_RELATIONSHIP_UPDATED',
    entityType: 'infracredit_relationship',
    entityId: assetCoId,
    details: { fields: Object.keys(fields) },
  });

  return getRelationship(assetCoId);
}

module.exports = { getRelationship, createRelationship, updateRelationship };
