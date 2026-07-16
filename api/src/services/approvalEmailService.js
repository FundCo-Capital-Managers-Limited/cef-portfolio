const resend = require('../config/resend');
const logger = require('../utils/logger');

const FROM_ADDRESS = 'CEF-PIP <alerts@updates.fundco.ng>';

async function send(to, subject, text) {
  if (!to.length) return;
  const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, text });
  if (error) {
    logger.error('Approval workflow email failed to send', { subject, error: error.message || error });
    return;
  }
  logger.info('Approval workflow email sent', { subject, recipients: to.length });
}

async function sendApprovalRequestedEmail({ requesterEmail, actionType, payload, recipientEmails }) {
  const action = actionType.replace('SERIES_', '').toLowerCase();
  const subject = `[CEF-PIP] Approval needed: series ${action}`;
  const text = `${requesterEmail} submitted a series ${action} request that needs your approval.\n\nDetails: ${JSON.stringify(payload, null, 2)}\n\nReview it on the Approvals page in CEF-PIP.`;
  await send(recipientEmails, subject, text);
}

async function sendApprovalDecidedEmail({ requesterEmail, decision, actionType, decidedBy }) {
  const action = actionType.replace('SERIES_', '').toLowerCase();
  const subject = `[CEF-PIP] Your series ${action} request was ${decision}`;
  const text = `Your series ${action} request was ${decision} by ${decidedBy}.\n\nCheck the Approvals page in CEF-PIP for details.`;
  await send([requesterEmail], subject, text);
}

module.exports = { sendApprovalRequestedEmail, sendApprovalDecidedEmail };
