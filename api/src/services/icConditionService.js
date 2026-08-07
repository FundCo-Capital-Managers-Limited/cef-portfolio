const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const notificationService = require('./notificationService');

const TYPES = [
  'CP_TO_DOCUMENTATION', 'CP_TO_FIRST_DRAWDOWN', 'CP_TO_LATER_DRAWDOWN',
  'CONDITION_SUBSEQUENT', 'COVENANT', 'INFORMATION_UNDERTAKING',
  'MONITORING_REQUIREMENT', 'MANAGEMENT_ACTION', 'IC_ACTION',
];
const STATUSES = ['OPEN', 'PENDING_EVIDENCE', 'UNDER_REVIEW', 'SATISFIED', 'WAIVED', 'OVERDUE', 'BREACHED'];

async function assertMatterExists(matterId) {
  const { data: matter, error } = await supabase.from('ic_matters').select('id, title').eq('id', matterId).maybeSingle();
  if (error) throw error;
  if (!matter) throw Object.assign(new Error('Matter not found'), { status: 404 });
  return matter;
}

async function notifyOwner(condition, matterTitle, actorEmail) {
  if (!condition.owner_user_id) return;
  const { data: owner, error } = await supabase.from('users').select('email').eq('id', condition.owner_user_id).maybeSingle();
  if (error) throw error;
  if (!owner || owner.email === actorEmail) return;

  await notificationService.notify({
    type: 'ic_condition_assigned',
    message: `You've been assigned a condition on "${matterTitle}": ${condition.wording}`,
    icMatterId: condition.matter_id,
    createdByEmail: actorEmail,
    recipientEmails: [owner.email],
  });
}

async function createCondition(matterId, { decisionId, type, wording, ownerUserId, dueDate }, user) {
  if (!type || !TYPES.includes(type)) {
    throw Object.assign(new Error(`type must be one of: ${TYPES.join(', ')}`), { status: 400 });
  }
  if (!wording) throw Object.assign(new Error('wording is required'), { status: 400 });

  const matter = await assertMatterExists(matterId);

  const { data: condition, error } = await supabase
    .from('ic_conditions')
    .insert({
      matter_id: matterId,
      decision_id: decisionId || null,
      type,
      wording,
      owner_user_id: ownerUserId || null,
      due_date: dueDate || null,
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
    action: 'IC_CONDITION_CREATED',
    entityType: 'ic_matter',
    entityId: matterId,
    details: { conditionId: condition.id, type, wording },
  });

  await notifyOwner(condition, matter.title, user.email);

  return condition;
}

async function listConditionsForMatter(matterId) {
  await assertMatterExists(matterId);
  const { data, error } = await supabase
    .from('ic_conditions')
    .select('*')
    .eq('matter_id', matterId)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Secretariat dashboard (Abiodun's ask, 2026-08-05 walkthrough): every
 * condition/action across every matter, not sliced to a top-5 summary like
 * icDashboardService's — this is the actual working list secretariat staff
 * triage from, with the matter title attached so it reads without a
 * separate lookup per row.
 */
async function listAllWithMatterTitle() {
  const [{ data: conditions, error }, { data: matters, error: mattersError }] = await Promise.all([
    supabase.from('ic_conditions').select('*').order('due_date', { ascending: true }),
    supabase.from('ic_matters').select('id, title'),
  ]);
  if (error) throw error;
  if (mattersError) throw mattersError;

  const titleByMatterId = new Map((matters || []).map((m) => [m.id, m.title]));
  return (conditions || []).map((c) => ({ ...c, matter_title: titleByMatterId.get(c.matter_id) || null }));
}

async function getCondition(conditionId) {
  const { data: condition, error } = await supabase.from('ic_conditions').select('*').eq('id', conditionId).maybeSingle();
  if (error) throw error;
  if (!condition) throw Object.assign(new Error('Condition not found'), { status: 404 });
  return condition;
}

async function updateCondition(conditionId, { status, wording, ownerUserId, dueDate }, user) {
  if (status !== undefined && !STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${STATUSES.join(', ')}`), { status: 400 });
  }

  const existing = await getCondition(conditionId);
  const matter = await assertMatterExists(existing.matter_id);
  // Snapshotted before the update call below — some clients (including the
  // fake one used in tests) return/mutate the same row object in place, so
  // reading existing.owner_user_id AFTER the update would silently see the
  // new value instead of the old one.
  const previousOwnerId = existing.owner_user_id;
  const previousStatus = existing.status;
  const matterId = existing.matter_id;

  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (wording !== undefined) patch.wording = wording;
  if (ownerUserId !== undefined) patch.owner_user_id = ownerUserId;
  if (dueDate !== undefined) patch.due_date = dueDate;

  const { data: updated, error } = await supabase.from('ic_conditions').update(patch).eq('id', conditionId).select().single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_CONDITION_UPDATED',
    entityType: 'ic_matter',
    entityId: matterId,
    details: { conditionId, fromStatus: previousStatus, status, ownerUserId },
  });

  // Re-notify only when ownership actually changed hands - not on every
  // field edit, so a status update doesn't spam the same owner repeatedly.
  if (ownerUserId !== undefined && ownerUserId !== previousOwnerId) {
    await notifyOwner(updated, matter.title, user.email);
  }

  return updated;
}

module.exports = { createCondition, listConditionsForMatter, listAllWithMatterTitle, getCondition, updateCondition, TYPES, STATUSES };
