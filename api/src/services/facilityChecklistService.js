const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { BUSINESS_MODELS, DEFAULT_CHECKLIST_ITEMS, CHECKLIST_ITEM_STATUSES } = require('../utils/facilityEnums');

async function assertFacilityExists(facilityId) {
  const { data: facility, error } = await supabase.from('cef_facilities').select('id, assetco_id').eq('id', facilityId).maybeSingle();
  if (error) throw error;
  if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });
  return facility;
}

/**
 * Applies the default checklist for a business model to a facility — copies
 * the current DEFAULT_CHECKLIST_ITEMS labels into rows rather than
 * referencing a template, so later changes to the defaults never rewrite an
 * already-applied checklist. Safe to call more than once for the same
 * business model — skips labels already present rather than duplicating them.
 */
async function applyChecklist(facilityId, businessModel, user) {
  if (!BUSINESS_MODELS.includes(businessModel)) {
    throw Object.assign(new Error(`businessModel must be one of: ${BUSINESS_MODELS.join(', ')}`), { status: 400 });
  }
  const facility = await assertFacilityExists(facilityId);

  const { data: existing, error: existingError } = await supabase
    .from('facility_checklist_items')
    .select('label')
    .eq('facility_id', facilityId);
  if (existingError) throw existingError;
  const existingLabels = new Set((existing || []).map((r) => r.label));

  const toInsert = DEFAULT_CHECKLIST_ITEMS[businessModel]
    .filter((label) => !existingLabels.has(label))
    .map((label) => ({
      facility_id: facilityId,
      assetco_id: facility.assetco_id,
      business_model: businessModel,
      label,
      status: 'PENDING',
      created_by_user_id: user.id,
      created_by_email: user.email,
    }));

  if (toInsert.length) {
    const { error } = await supabase.from('facility_checklist_items').insert(toInsert);
    if (error) throw error;
  }

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: facility.assetco_id,
    action: 'FACILITY_CHECKLIST_APPLIED',
    entityType: 'cef_facility',
    entityId: facilityId,
    details: { businessModel, itemsAdded: toInsert.length },
  });

  return listChecklist(facilityId);
}

async function addItem(facilityId, { label, businessModel }, user) {
  if (!label) throw Object.assign(new Error('label is required'), { status: 400 });
  const facility = await assertFacilityExists(facilityId);

  const { data: item, error } = await supabase
    .from('facility_checklist_items')
    .insert({
      facility_id: facilityId,
      assetco_id: facility.assetco_id,
      business_model: businessModel || null,
      label,
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
    action: 'FACILITY_CHECKLIST_ITEM_ADDED',
    entityType: 'cef_facility',
    entityId: facilityId,
    details: { label },
  });

  return item;
}

async function listChecklist(facilityId) {
  await assertFacilityExists(facilityId);
  const { data, error } = await supabase.from('facility_checklist_items').select('*').eq('facility_id', facilityId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getItemFacility(itemId) {
  const { data: item, error } = await supabase.from('facility_checklist_items').select('facility_id').eq('id', itemId).maybeSingle();
  if (error) throw error;
  if (!item) throw Object.assign(new Error('Checklist item not found'), { status: 404 });
  return assertFacilityExists(item.facility_id);
}

async function updateItem(itemId, { status, notes }, user) {
  if (status !== undefined && !CHECKLIST_ITEM_STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${CHECKLIST_ITEM_STATUSES.join(', ')}`), { status: 400 });
  }
  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) {
    patch.status = status;
    if (status === 'DONE') {
      patch.completed_by_user_id = user.id;
      patch.completed_by_email = user.email;
      patch.completed_at = new Date().toISOString();
    } else {
      patch.completed_by_user_id = null;
      patch.completed_by_email = null;
      patch.completed_at = null;
    }
  }
  if (notes !== undefined) patch.notes = notes;

  const { data: updated, error } = await supabase.from('facility_checklist_items').update(patch).eq('id', itemId).select().single();
  if (error) throw error;
  if (!updated) throw Object.assign(new Error('Checklist item not found'), { status: 404 });
  return updated;
}

module.exports = { applyChecklist, addItem, listChecklist, getItemFacility, updateItem };
