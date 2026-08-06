const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { MILESTONE_STATUSES } = require('../utils/facilityEnums');

async function assertFacilityExists(facilityId) {
  const { data: facility, error } = await supabase.from('cef_facilities').select('id, assetco_id').eq('id', facilityId).maybeSingle();
  if (error) throw error;
  if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });
  return facility;
}

async function addMilestone(facilityId, { title, description, targetDate }, user) {
  if (!title) throw Object.assign(new Error('title is required'), { status: 400 });
  const facility = await assertFacilityExists(facilityId);

  const { data: milestone, error } = await supabase
    .from('facility_milestones')
    .insert({
      facility_id: facilityId,
      assetco_id: facility.assetco_id,
      title,
      description: description || null,
      target_date: targetDate || null,
      status: 'PENDING',
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
    actorAssetcoId: facility.assetco_id,
    action: 'FACILITY_MILESTONE_ADDED',
    entityType: 'cef_facility',
    entityId: facilityId,
    details: { title, targetDate },
  });

  return milestone;
}

async function listMilestones(facilityId) {
  await assertFacilityExists(facilityId);
  const { data, error } = await supabase.from('facility_milestones').select('*').eq('facility_id', facilityId).order('target_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getMilestoneFacility(milestoneId) {
  const { data: milestone, error } = await supabase.from('facility_milestones').select('facility_id').eq('id', milestoneId).maybeSingle();
  if (error) throw error;
  if (!milestone) throw Object.assign(new Error('Milestone not found'), { status: 404 });
  return assertFacilityExists(milestone.facility_id);
}

async function updateMilestone(milestoneId, { status, targetDate, completedDate, evidenceUrl, notes }, user) {
  if (status !== undefined && !MILESTONE_STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${MILESTONE_STATUSES.join(', ')}`), { status: 400 });
  }
  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (targetDate !== undefined) patch.target_date = targetDate;
  if (completedDate !== undefined) patch.completed_date = completedDate;
  if (evidenceUrl !== undefined) patch.evidence_url = evidenceUrl;
  if (notes !== undefined) patch.notes = notes;
  // Marking COMPLETED without an explicit completedDate defaults to today —
  // the common case is confirming the milestone happened, not backdating it.
  if (status === 'COMPLETED' && completedDate === undefined) patch.completed_date = new Date().toISOString().slice(0, 10);

  const { data: existing, error: existingError } = await supabase.from('facility_milestones').select('facility_id').eq('id', milestoneId).maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw Object.assign(new Error('Milestone not found'), { status: 404 });
  const facility = await assertFacilityExists(existing.facility_id);

  const { data: updated, error } = await supabase.from('facility_milestones').update(patch).eq('id', milestoneId).select().single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: facility.assetco_id,
    action: 'FACILITY_MILESTONE_UPDATED',
    entityType: 'cef_facility',
    entityId: existing.facility_id,
    details: { milestoneId, fields: Object.keys(patch) },
  });

  return updated;
}

module.exports = { addMilestone, listMilestones, updateMilestone, getMilestoneFacility, MILESTONE_STATUSES };
