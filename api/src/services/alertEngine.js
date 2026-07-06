const resend = require('../config/resend');
const supabase = require('../config/supabase');
const env = require('../config/env');

const FROM_ADDRESS = 'CEF-PIP Alerts <alerts@cef-pip.dev>';

async function logAlert({ alertType, assetCoId, assetId, customerId, message, eventId }) {
  const { error } = await supabase.from('alerts').insert({
    alert_type: alertType,
    assetco_id: assetCoId,
    asset_id: assetId || null,
    customer_id: customerId || null,
    message,
    event_id: eventId || null,
  });
  if (error) throw error;
}

async function sendEmail(subject, text) {
  if (!env.alertRecipients.length) return;
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: env.alertRecipients,
    subject,
    text,
  });
}

async function sendDefaultAlert(payload, eventId) {
  const message = `Customer ${payload.customerId || 'unknown'} defaulted on asset ${payload.assetId} (AssetCo: ${payload.assetCoId}). Amount: ${payload.amount} ${payload.currency}.`;
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
  const message = `Fault detected on asset ${payload.assetId} (AssetCo: ${payload.assetCoId}) at ${payload.timestamp}.`;
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

module.exports = { sendDefaultAlert, sendFaultAlert };
