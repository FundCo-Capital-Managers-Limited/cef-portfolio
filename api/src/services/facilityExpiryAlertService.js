const supabase = require('../config/supabase');
const { sendFacilityAlert } = require('./alertEngine');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

// Same recipient set as the flags feature, plus Risk (this is squarely their
// register) — management/it_admin/finance are excluded from Flags for a
// different reason (per flagService's own comment) but expiry lapses are a
// credit-risk concern first.
const EXPIRY_NOTIFICATION_ROLES = ['management', 'risk', 'finance'];
const WARNING_WINDOW_DAYS = 30;
const COVENANT_WARNING_WINDOW_DAYS = 7;

async function recipientEmails() {
  const { data, error } = await supabase.from('users').select('email').in('role', EXPIRY_NOTIFICATION_ROLES);
  if (error) throw error;
  return (data || []).map((u) => u.email);
}

async function alreadyAlerted(alertType, columnName, id) {
  const { data } = await supabase.from('alerts').select('id').eq('alert_type', alertType).eq(columnName, id).maybeSingle();
  return Boolean(data);
}

async function raise({ alertType, columnName, id, assetCoId, facilityId, message, idField }) {
  if (await alreadyAlerted(alertType, columnName, id)) return false;
  await sendFacilityAlert({ alertType, assetCoId, facilityId, message, [idField]: id });
  const recipients = await recipientEmails();
  await notificationService.notify({ type: alertType.toLowerCase(), message, recipientEmails: recipients });
  return true;
}

function daysUntil(dateStr, todayIso) {
  return Math.floor((Date.parse(dateStr) - Date.parse(todayIso)) / 86400000);
}

/**
 * Nightly check: documents/security nearing or past their recorded expiry,
 * and covenant tests nearing or past their due date. Each condition is only
 * ever alerted once (checked via the alerts table itself, same dedupe
 * pattern as checkFacilityArrears), so this can run every night without
 * spamming the same lapse repeatedly.
 */
async function checkFacilityExpiries() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const results = { documentsExpiring: 0, documentsExpired: 0, securityExpiring: 0, securityExpired: 0, covenantsDue: 0, covenantsOverdue: 0 };

  const { data: documents, error: documentsError } = await supabase
    .from('facility_documents')
    .select('*')
    .not('expiry_date', 'is', null)
    .not('status', 'eq', 'EXPIRED');
  if (documentsError) throw documentsError;

  for (const doc of documents || []) {
    // eslint-disable-next-line no-await-in-loop
    const facility = await getFacility(doc.facility_id);
    const days = daysUntil(doc.expiry_date, todayIso);
    if (days < 0) {
      // eslint-disable-next-line no-await-in-loop
      await supabase.from('facility_documents').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', doc.id);
      // eslint-disable-next-line no-await-in-loop
      const raised = await raise({
        alertType: 'FACILITY_DOCUMENT_EXPIRED',
        columnName: 'facility_document_id',
        id: doc.id,
        assetCoId: facility?.assetco_id,
        facilityId: doc.facility_id,
        idField: 'facilityDocumentId',
        message: `Document "${doc.title}" on facility ${facility?.facility_reference || doc.facility_id} expired on ${doc.expiry_date}.`,
      });
      if (raised) results.documentsExpired += 1;
    } else if (days <= WARNING_WINDOW_DAYS) {
      // eslint-disable-next-line no-await-in-loop
      const raised = await raise({
        alertType: 'FACILITY_DOCUMENT_EXPIRING',
        columnName: 'facility_document_id',
        id: doc.id,
        assetCoId: facility?.assetco_id,
        facilityId: doc.facility_id,
        idField: 'facilityDocumentId',
        message: `Document "${doc.title}" on facility ${facility?.facility_reference || doc.facility_id} expires on ${doc.expiry_date} (${days} days).`,
      });
      if (raised) results.documentsExpiring += 1;
    }
  }

  const { data: security, error: securityError } = await supabase.from('facility_security').select('*').not('insurance_expiry_date', 'is', null);
  if (securityError) throw securityError;

  for (const sec of security || []) {
    // eslint-disable-next-line no-await-in-loop
    const facility = await getFacility(sec.facility_id);
    const days = daysUntil(sec.insurance_expiry_date, todayIso);
    if (days < 0) {
      // eslint-disable-next-line no-await-in-loop
      const raised = await raise({
        alertType: 'FACILITY_SECURITY_INSURANCE_EXPIRED',
        columnName: 'facility_security_id',
        id: sec.id,
        assetCoId: facility?.assetco_id,
        facilityId: sec.facility_id,
        idField: 'facilitySecurityId',
        message: `Insurance on "${sec.security_type}" (facility ${facility?.facility_reference || sec.facility_id}) expired on ${sec.insurance_expiry_date}.`,
      });
      if (raised) results.securityExpired += 1;
    } else if (days <= WARNING_WINDOW_DAYS) {
      // eslint-disable-next-line no-await-in-loop
      const raised = await raise({
        alertType: 'FACILITY_SECURITY_INSURANCE_EXPIRING',
        columnName: 'facility_security_id',
        id: sec.id,
        assetCoId: facility?.assetco_id,
        facilityId: sec.facility_id,
        idField: 'facilitySecurityId',
        message: `Insurance on "${sec.security_type}" (facility ${facility?.facility_reference || sec.facility_id}) expires on ${sec.insurance_expiry_date} (${days} days).`,
      });
      if (raised) results.securityExpiring += 1;
    }
  }

  const { data: covenants, error: covenantsError } = await supabase.from('facility_covenants').select('*').not('next_test_due_date', 'is', null);
  if (covenantsError) throw covenantsError;

  for (const cov of covenants || []) {
    // eslint-disable-next-line no-await-in-loop
    const facility = await getFacility(cov.facility_id);
    const days = daysUntil(cov.next_test_due_date, todayIso);
    if (days < 0) {
      // eslint-disable-next-line no-await-in-loop
      const raised = await raise({
        alertType: 'FACILITY_COVENANT_TEST_OVERDUE',
        columnName: 'facility_covenant_id',
        id: cov.id,
        assetCoId: facility?.assetco_id,
        facilityId: cov.facility_id,
        idField: 'facilityCovenantId',
        message: `Covenant test "${cov.covenant_description}" (facility ${facility?.facility_reference || cov.facility_id}) was due ${cov.next_test_due_date}.`,
      });
      if (raised) results.covenantsOverdue += 1;
    } else if (days <= COVENANT_WARNING_WINDOW_DAYS) {
      // eslint-disable-next-line no-await-in-loop
      const raised = await raise({
        alertType: 'FACILITY_COVENANT_TEST_DUE',
        columnName: 'facility_covenant_id',
        id: cov.id,
        assetCoId: facility?.assetco_id,
        facilityId: cov.facility_id,
        idField: 'facilityCovenantId',
        message: `Covenant test "${cov.covenant_description}" (facility ${facility?.facility_reference || cov.facility_id}) is due ${cov.next_test_due_date} (${days} days).`,
      });
      if (raised) results.covenantsDue += 1;
    }
  }

  logger.info('Facility expiry check complete', results);
  return results;
}

async function getFacility(facilityId) {
  const { data, error } = await supabase.from('cef_facilities').select('id, assetco_id, facility_reference').eq('id', facilityId).maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = { checkFacilityExpiries };
