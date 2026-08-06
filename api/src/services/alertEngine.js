const resend = require('../config/resend');
const supabase = require('../config/supabase');
const env = require('../config/env');
const logger = require('../utils/logger');

const FROM_ADDRESS = 'CEF-PIP Alerts <alerts@updates.fundco.ng>';

async function logAlert({
  alertType,
  assetCoId,
  assetId,
  customerId,
  message,
  eventId,
  facilityId,
  scheduleId,
  facilityDocumentId,
  facilitySecurityId,
  facilityCovenantId,
}) {
  const { error } = await supabase.from('alerts').insert({
    alert_type: alertType,
    assetco_id: assetCoId,
    asset_id: assetId || null,
    customer_id: customerId || null,
    message,
    event_id: eventId || null,
    facility_id: facilityId || null,
    schedule_id: scheduleId || null,
    facility_document_id: facilityDocumentId || null,
    facility_security_id: facilitySecurityId || null,
    facility_covenant_id: facilityCovenantId || null,
  });
  if (error) throw error;
  logger.info('Alert recorded', { alertType, assetCoId, assetId, facilityId });
}

async function sendEmail(subject, text) {
  if (!env.alertRecipients.length) {
    logger.warn('Alert email skipped: no ALERT_RECIPIENT_EMAILS configured', { subject });
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: env.alertRecipients,
    subject,
    text,
  });
  if (error) {
    logger.error('Alert email failed to send', { subject, error: error.message || error });
    return;
  }
  logger.info('Alert email sent', { subject, recipients: env.alertRecipients.length });
}

/**
 * Looks up the customer's name and the asset's type so alert text reads
 * "Ade Okafor defaulted on their Solar Home System" rather than "Customer
 * CUS-0003 defaulted on asset GS-1001" — an ID alone means nothing to
 * whoever reads the alert email or the dashboard's Active Alerts panel.
 * Falls back to the raw ID if a name/type isn't available (e.g. the
 * customer/asset stub hasn't been filled in yet).
 */
async function describeCustomerAndAsset(customerId, assetId) {
  const [{ data: customer }, { data: asset }] = await Promise.all([
    customerId ? supabase.from('customers').select('name').eq('id', customerId).maybeSingle() : { data: null },
    assetId ? supabase.from('assets').select('asset_type').eq('id', assetId).maybeSingle() : { data: null },
  ]);
  return {
    customerLabel: customer?.name || customerId || 'A customer',
    assetLabel: asset?.asset_type || `asset ${assetId}`,
  };
}

async function sendDefaultAlert(payload, eventId) {
  const { customerLabel, assetLabel } = await describeCustomerAndAsset(payload.customerId, payload.assetId);
  const message = `${customerLabel} defaulted on their ${assetLabel} (AssetCo: ${payload.assetCoId}). Amount: ${payload.amount} ${payload.currency}.`;
  await sendEmail(`[CEF-PIP] Payment Default — ${payload.assetId}`, message);
  await logAlert({
    alertType: 'payment.defaulted',
    assetCoId: payload.assetCoId,
    assetId: payload.assetId,
    customerId: payload.customerId,
    message,
    eventId,
  });
}

async function sendFaultAlert(payload, eventId) {
  const { assetLabel } = await describeCustomerAndAsset(null, payload.assetId);
  const message = `Fault detected on ${assetLabel} (AssetCo: ${payload.assetCoId}) at ${payload.timestamp}.`;
  await sendEmail(`[CEF-PIP] Asset Fault — ${payload.assetId}`, message);
  await logAlert({
    alertType: 'asset.fault.detected',
    assetCoId: payload.assetCoId,
    assetId: payload.assetId,
    customerId: payload.customerId,
    message,
    eventId,
  });
}

/**
 * Feature 7 (Facility & Repayment Addendum): ALT-14/15/16 — missed CEF
 * facility repayment, 7-days-overdue escalation, approaching maturity.
 * Recipients: CEF Management + Finance Analyst (env.alertRecipients is a
 * single configured list for MVP — no per-role routing yet).
 */
async function sendFacilityAlert({
  alertType,
  assetCoId,
  facilityId,
  scheduleId,
  facilityDocumentId,
  facilitySecurityId,
  facilityCovenantId,
  message,
}) {
  await sendEmail(`[CEF-PIP] ${alertType.replace(/_/g, ' ')}`, message);
  await logAlert({ alertType, assetCoId, message, facilityId, scheduleId, facilityDocumentId, facilitySecurityId, facilityCovenantId });
}

module.exports = { sendDefaultAlert, sendFaultAlert, sendFacilityAlert };
