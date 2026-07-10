const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const logger = require('../utils/logger');
const { SECTORS } = require('../utils/assetcoEnums');

const REQUIRED_FIELDS = ['companyName', 'primaryContactName', 'primaryContactEmail'];

function validateSubmission(body) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!body[field]) errors.push(`${field} is required`);
  }
  if (body.sector && !SECTORS.includes(body.sector)) {
    errors.push(`sector must be one of: ${SECTORS.join(', ')}`);
  }
  return errors;
}

/**
 * Public, unauthenticated submission — no CEF user is logged in, so this
 * writes straight to the review queue (assetco_applications), never to the
 * live `assetcos` table. actor_user_id is null on the resulting audit_log
 * row (mirrors how AssetCo-webhook-driven audit entries already work) —
 * actor_type 'system' distinguishes it for the notification feed.
 */
async function submitApplication(body) {
  const errors = validateSubmission(body);
  if (errors.length) throw Object.assign(new Error('Invalid application'), { status: 400, details: errors });

  const { data, error } = await supabase
    .from('assetco_applications')
    .insert({
      company_name: body.companyName,
      legal_entity_name: body.legalEntityName || null,
      registration_number: body.registrationNumber || null,
      website: body.website || null,
      sector: body.sector || null,
      business_description: body.businessDescription || null,
      hq_state: body.hqState || null,
      operating_states: body.operatingStates || null,
      asset_types: body.assetTypes || null,
      customer_types: body.customerTypes || null,
      primary_contact_name: body.primaryContactName,
      primary_contact_email: body.primaryContactEmail,
      primary_contact_phone: body.primaryContactPhone || null,
      status: 'PENDING',
    })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'system',
    action: 'ASSETCO_APPLICATION_SUBMITTED',
    entityType: 'assetco_application',
    entityId: data.id,
    details: { companyName: data.company_name, primaryContactEmail: data.primary_contact_email },
  });

  logger.info('AssetCo application submitted', { applicationId: data.id, companyName: data.company_name });

  return data;
}

async function listApplications() {
  const { data, error } = await supabase
    .from('assetco_applications')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getApplication(id) {
  const { data, error } = await supabase.from('assetco_applications').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Approving an application promotes it into a real `assetcos` row at
 * pipeline_stage 'ONBOARDING' — the reviewer assigns the AssetCo's id (the
 * natural-key primary key every other table already FKs against), since a
 * self-submitted company name can't be trusted as a stable identifier.
 */
async function reviewApplication(id, { decision, notes, assetcoId, reviewer }) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw Object.assign(new Error('decision must be APPROVED or REJECTED'), { status: 400 });
  }
  const application = await getApplication(id);
  if (!application) throw Object.assign(new Error('Application not found'), { status: 404 });
  if (application.status !== 'PENDING' && application.status !== 'UNDER_REVIEW') {
    throw Object.assign(new Error(`Application already ${application.status.toLowerCase()}`), { status: 400 });
  }

  let promotedAssetcoId = null;

  if (decision === 'APPROVED') {
    if (!assetcoId) throw Object.assign(new Error('assetcoId is required to approve an application'), { status: 400 });

    const { error: assetcoError } = await supabase.from('assetcos').insert({
      id: assetcoId,
      name: application.company_name,
      hmac_secret: `pending-setup-${assetcoId.toLowerCase()}`,
      is_active: true,
      legal_entity_name: application.legal_entity_name,
      registration_number: application.registration_number,
      website: application.website,
      pipeline_stage: 'ONBOARDING',
      asset_types: application.asset_types,
      customer_types: application.customer_types,
      sector: application.sector,
      business_description: application.business_description,
      hq_state: application.hq_state,
      operating_states: application.operating_states,
      primary_contact_name: application.primary_contact_name,
      primary_contact_email: application.primary_contact_email,
      primary_contact_phone: application.primary_contact_phone,
      integration_type: 'MANUAL',
      stage_updated_at: new Date().toISOString(),
      stage_updated_by: reviewer.id,
    });
    if (assetcoError) throw assetcoError;

    await supabase.from('assetco_stage_log').insert({
      assetco_id: assetcoId,
      from_stage: null,
      to_stage: 'ONBOARDING',
      changed_by: reviewer.id,
      changed_by_name: reviewer.email,
      notes: 'Promoted from an approved onboarding application.',
    });

    promotedAssetcoId = assetcoId;
  }

  const { data: updated, error: updateError } = await supabase
    .from('assetco_applications')
    .update({
      status: decision,
      review_notes: notes || null,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      promoted_assetco_id: promotedAssetcoId,
    })
    .eq('id', id)
    .select()
    .single();
  if (updateError) throw updateError;

  await recordAudit({
    actorType: 'user',
    actorUserId: reviewer.id,
    actorAssetcoId: promotedAssetcoId,
    action: decision === 'APPROVED' ? 'ASSETCO_APPLICATION_APPROVED' : 'ASSETCO_APPLICATION_REJECTED',
    entityType: 'assetco_application',
    entityId: id,
    details: { companyName: application.company_name, notes },
  });

  return updated;
}

module.exports = { submitApplication, listApplications, getApplication, reviewApplication };
