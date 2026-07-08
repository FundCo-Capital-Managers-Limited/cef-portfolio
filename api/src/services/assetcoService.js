const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { PIPELINE_STAGES } = require('../utils/assetcoEnums');

async function listAssetcos(user) {
  let query = supabase.from('assetcos').select('*').order('name');
  if (user.role === 'assetco_admin') {
    query = query.eq('id', user.assetcoId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getAssetco(id) {
  const { data, error } = await supabase.from('assetcos').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function createAssetco(fields, user) {
  const { error } = await supabase.from('assetcos').insert(fields);
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorAssetcoId: fields.id,
    action: 'ASSETCO_CREATED',
    entityType: 'assetco',
    entityId: fields.id,
    details: { name: fields.name },
  });

  return getAssetco(fields.id);
}

async function updateAssetcoProfile(id, fields, user) {
  const { error } = await supabase.from('assetcos').update(fields).eq('id', id);
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorAssetcoId: id,
    action: 'ASSETCO_PROFILE_UPDATED',
    entityType: 'assetco',
    entityId: id,
    details: { fields: Object.keys(fields) },
  });

  return getAssetco(id);
}

/**
 * Advances (or, for CEF-wide roles, corrects) an AssetCo's pipeline stage.
 * assetco_admin may only set their own AssetCo to ONBOARDING — everything
 * else (including forward progression through the rest of the pipeline)
 * requires a CEF-wide management/it_admin role.
 */
async function advanceStage(assetCoId, toStage, notes, user) {
  if (!PIPELINE_STAGES.includes(toStage)) {
    const err = new Error(`stage must be one of: ${PIPELINE_STAGES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const isAssetcoAdminSelf = user.role === 'assetco_admin' && user.assetcoId === assetCoId;
  const isCefManagement = ['management', 'it_admin'].includes(user.role);

  if (isAssetcoAdminSelf) {
    if (toStage !== 'ONBOARDING') {
      const err = new Error('assetco_admin may only set their AssetCo to ONBOARDING');
      err.status = 403;
      throw err;
    }
  } else if (!isCefManagement) {
    const err = new Error('Insufficient role to change pipeline stage');
    err.status = 403;
    throw err;
  }

  const assetco = await getAssetco(assetCoId);
  if (!assetco) {
    const err = new Error('AssetCo not found');
    err.status = 404;
    throw err;
  }

  const fromStage = assetco.pipeline_stage;

  const { error: updateError } = await supabase
    .from('assetcos')
    .update({ pipeline_stage: toStage, stage_updated_at: new Date().toISOString(), stage_updated_by: user.id })
    .eq('id', assetCoId);
  if (updateError) throw updateError;

  const { error: logError } = await supabase.from('assetco_stage_log').insert({
    assetco_id: assetCoId,
    from_stage: fromStage,
    to_stage: toStage,
    changed_by: user.id,
    changed_by_name: user.email,
    notes: notes || null,
  });
  if (logError) throw logError;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorAssetcoId: assetCoId,
    action: 'ASSETCO_STAGE_CHANGED',
    entityType: 'assetco',
    entityId: assetCoId,
    details: { fromStage, toStage, notes },
  });

  return getAssetco(assetCoId);
}

async function getStageLog(assetCoId) {
  const { data, error } = await supabase
    .from('assetco_stage_log')
    .select('*')
    .eq('assetco_id', assetCoId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = { listAssetcos, getAssetco, createAssetco, updateAssetcoProfile, advanceStage, getStageLog };
