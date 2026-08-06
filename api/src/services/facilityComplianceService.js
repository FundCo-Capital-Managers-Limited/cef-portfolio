const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');

const DOCUMENT_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EXECUTED', 'SUPERSEDED', 'EXPIRED', 'ARCHIVED'];
const COVENANT_TYPES = ['FINANCIAL', 'REPORTING', 'OPERATIONAL', 'NEGATIVE'];
const COMPLIANCE_STATUSES = ['COMPLIANT', 'NON_COMPLIANT', 'PENDING'];

async function assertFacilityExists(facilityId) {
  const { data: facility, error } = await supabase.from('cef_facilities').select('id, assetco_id').eq('id', facilityId).maybeSingle();
  if (error) throw error;
  if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });
  return facility;
}

// --- Documents (Module A: Loan Documentation Monitoring) ---

async function addDocument(facilityId, { title, classification, sharepointUrl, expiryDate }, user) {
  if (!title || !classification) throw Object.assign(new Error('title and classification are required'), { status: 400 });
  const facility = await assertFacilityExists(facilityId);

  const { data: doc, error } = await supabase
    .from('facility_documents')
    .insert({
      facility_id: facilityId,
      title,
      classification,
      status: 'DRAFT',
      sharepoint_url: sharepointUrl || null,
      expiry_date: expiryDate || null,
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
    action: 'FACILITY_DOCUMENT_ADDED',
    entityType: 'cef_facility',
    entityId: facilityId,
    details: { title, classification },
  });

  return doc;
}

async function listDocuments(facilityId) {
  await assertFacilityExists(facilityId);
  const { data, error } = await supabase.from('facility_documents').select('*').eq('facility_id', facilityId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getDocumentFacility(documentId) {
  const { data: doc, error } = await supabase.from('facility_documents').select('facility_id').eq('id', documentId).maybeSingle();
  if (error) throw error;
  if (!doc) throw Object.assign(new Error('Document not found'), { status: 404 });
  return assertFacilityExists(doc.facility_id);
}

async function getSecurityFacility(securityId) {
  const { data: sec, error } = await supabase.from('facility_security').select('facility_id').eq('id', securityId).maybeSingle();
  if (error) throw error;
  if (!sec) throw Object.assign(new Error('Security record not found'), { status: 404 });
  return assertFacilityExists(sec.facility_id);
}

async function getCovenantFacility(covenantId) {
  const { data: cov, error } = await supabase.from('facility_covenants').select('facility_id').eq('id', covenantId).maybeSingle();
  if (error) throw error;
  if (!cov) throw Object.assign(new Error('Covenant not found'), { status: 404 });
  return assertFacilityExists(cov.facility_id);
}

async function updateDocument(documentId, { status, sharepointUrl, expiryDate }, user) {
  if (status !== undefined && !DOCUMENT_STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${DOCUMENT_STATUSES.join(', ')}`), { status: 400 });
  }
  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (sharepointUrl !== undefined) patch.sharepoint_url = sharepointUrl;
  if (expiryDate !== undefined) patch.expiry_date = expiryDate;

  const { data: updated, error } = await supabase.from('facility_documents').update(patch).eq('id', documentId).select().single();
  if (error) throw error;
  if (!updated) throw Object.assign(new Error('Document not found'), { status: 404 });
  return updated;
}

async function confirmDocumentUpload(documentId, user) {
  const { data: existing, error: existingError } = await supabase.from('facility_documents').select('*').eq('id', documentId).maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw Object.assign(new Error('Document not found'), { status: 404 });
  if (!existing.sharepoint_url) throw Object.assign(new Error('Add the SharePoint URL before confirming the upload'), { status: 400 });

  const { data: updated, error } = await supabase
    .from('facility_documents')
    .update({ confirmed_by_user_id: user.id, confirmed_by_email: user.email, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

// --- Security (Module B: Security Monitoring Register) ---

async function addSecurity(facilityId, { securityType, valueNgn, perfectionStatus, insuranceStatus, insuranceExpiryDate, notes }, user) {
  if (!securityType) throw Object.assign(new Error('securityType is required'), { status: 400 });
  const facility = await assertFacilityExists(facilityId);

  const { data: security, error } = await supabase
    .from('facility_security')
    .insert({
      facility_id: facilityId,
      security_type: securityType,
      value_ngn: valueNgn ?? null,
      perfection_status: perfectionStatus || null,
      insurance_status: insuranceStatus || null,
      insurance_expiry_date: insuranceExpiryDate || null,
      notes: notes || null,
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
    action: 'FACILITY_SECURITY_ADDED',
    entityType: 'cef_facility',
    entityId: facilityId,
    details: { securityType },
  });

  return security;
}

async function listSecurity(facilityId) {
  await assertFacilityExists(facilityId);
  const { data, error } = await supabase.from('facility_security').select('*').eq('facility_id', facilityId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateSecurity(securityId, { valueNgn, perfectionStatus, insuranceStatus, insuranceExpiryDate, notes }, user) {
  const patch = { updated_at: new Date().toISOString() };
  if (valueNgn !== undefined) patch.value_ngn = valueNgn;
  if (perfectionStatus !== undefined) patch.perfection_status = perfectionStatus;
  if (insuranceStatus !== undefined) patch.insurance_status = insuranceStatus;
  if (insuranceExpiryDate !== undefined) patch.insurance_expiry_date = insuranceExpiryDate;
  if (notes !== undefined) patch.notes = notes;

  const { data: updated, error } = await supabase.from('facility_security').update(patch).eq('id', securityId).select().single();
  if (error) throw error;
  if (!updated) throw Object.assign(new Error('Security record not found'), { status: 404 });
  return updated;
}

// --- Covenants (Module E: Covenant Monitoring Register) ---

async function addCovenant(facilityId, { covenantDescription, covenantType, frequency, dueDate, nextTestDueDate }, user) {
  if (!covenantDescription || !covenantType || !COVENANT_TYPES.includes(covenantType)) {
    throw Object.assign(new Error(`covenantDescription is required and covenantType must be one of: ${COVENANT_TYPES.join(', ')}`), { status: 400 });
  }
  const facility = await assertFacilityExists(facilityId);

  const { data: covenant, error } = await supabase
    .from('facility_covenants')
    .insert({
      facility_id: facilityId,
      covenant_description: covenantDescription,
      covenant_type: covenantType,
      frequency: frequency || null,
      compliance_status: 'PENDING',
      last_tested_date: dueDate || null,
      next_test_due_date: nextTestDueDate || null,
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
    action: 'FACILITY_COVENANT_ADDED',
    entityType: 'cef_facility',
    entityId: facilityId,
    details: { covenantType, covenantDescription },
  });

  return covenant;
}

async function listCovenants(facilityId) {
  await assertFacilityExists(facilityId);
  const { data, error } = await supabase.from('facility_covenants').select('*').eq('facility_id', facilityId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateCovenant(covenantId, { complianceStatus, lastTestedDate, nextTestDueDate, notes }, user) {
  if (complianceStatus !== undefined && !COMPLIANCE_STATUSES.includes(complianceStatus)) {
    throw Object.assign(new Error(`complianceStatus must be one of: ${COMPLIANCE_STATUSES.join(', ')}`), { status: 400 });
  }
  const patch = { updated_at: new Date().toISOString() };
  if (complianceStatus !== undefined) patch.compliance_status = complianceStatus;
  if (lastTestedDate !== undefined) patch.last_tested_date = lastTestedDate;
  if (nextTestDueDate !== undefined) patch.next_test_due_date = nextTestDueDate;
  if (notes !== undefined) patch.notes = notes;

  const { data: updated, error } = await supabase.from('facility_covenants').update(patch).eq('id', covenantId).select().single();
  if (error) throw error;
  if (!updated) throw Object.assign(new Error('Covenant not found'), { status: 404 });
  return updated;
}

module.exports = {
  addDocument, listDocuments, updateDocument, confirmDocumentUpload, getDocumentFacility,
  addSecurity, listSecurity, updateSecurity, getSecurityFacility,
  addCovenant, listCovenants, updateCovenant, getCovenantFacility,
  DOCUMENT_STATUSES, COVENANT_TYPES, COMPLIANCE_STATUSES,
};
