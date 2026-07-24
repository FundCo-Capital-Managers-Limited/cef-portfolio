const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');

const CATEGORIES = ['NEW_INVESTMENT', 'DISBURSEMENT', 'PORTFOLIO_MANAGEMENT', 'PROBLEM_ASSET', 'EXIT_CLOSURE', 'POLICY'];
const STATUSES = ['OPEN', 'UNDER_REVIEW', 'SCHEDULED', 'DECIDED', 'CLOSED', 'WITHDRAWN'];

async function createMatter({ category, decisionType, title, description, assetcoId, dealLeadUserId }, user) {
  if (!category || !CATEGORIES.includes(category)) {
    throw Object.assign(new Error(`category must be one of: ${CATEGORIES.join(', ')}`), { status: 400 });
  }
  if (!decisionType || !title) {
    throw Object.assign(new Error('decisionType and title are required'), { status: 400 });
  }

  const { data: matter, error } = await supabase
    .from('ic_matters')
    .insert({
      category,
      decision_type: decisionType,
      title,
      description: description || null,
      assetco_id: assetcoId || null,
      deal_lead_user_id: dealLeadUserId || null,
      status: 'OPEN',
      created_by_user_id: user.id,
      created_by_email: user.email,
    })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: assetcoId || null,
    action: 'IC_MATTER_CREATED',
    entityType: 'ic_matter',
    entityId: matter.id,
    details: { category, decisionType, title },
  });

  return matter;
}

async function listMatters() {
  const { data, error } = await supabase.from('ic_matters').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getMatter(matterId) {
  const { data: matter, error } = await supabase.from('ic_matters').select('*').eq('id', matterId).maybeSingle();
  if (error) throw error;
  if (!matter) throw Object.assign(new Error('Matter not found'), { status: 404 });
  return matter;
}

async function updateMatter(matterId, fields, user) {
  const { status, decisionType, title, description, dealLeadUserId } = fields;
  if (status !== undefined && !STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${STATUSES.join(', ')}`), { status: 400 });
  }

  const existing = await getMatter(matterId);
  // Snapshotted before the update call — some clients (including the fake
  // one used in tests) return/mutate the same row object in place, so
  // reading existing.status AFTER the update would silently see the new
  // value instead of the old one.
  const previousStatus = existing.status;
  const assetcoId = existing.assetco_id;

  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (decisionType !== undefined) patch.decision_type = decisionType;
  if (title !== undefined) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (dealLeadUserId !== undefined) patch.deal_lead_user_id = dealLeadUserId;

  const { data: updated, error } = await supabase.from('ic_matters').update(patch).eq('id', matterId).select().single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: assetcoId,
    action: 'IC_MATTER_UPDATED',
    entityType: 'ic_matter',
    entityId: matterId,
    details: { fromStatus: previousStatus, ...fields },
  });

  return updated;
}

module.exports = { createMatter, listMatters, getMatter, updateMatter, CATEGORIES, STATUSES };
