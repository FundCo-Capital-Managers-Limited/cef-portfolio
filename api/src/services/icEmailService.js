const supabase = require('../config/supabase');
const resend = require('../config/resend');
const env = require('../config/env');
const logger = require('../utils/logger');
const { recordAudit } = require('./auditLog');

// Sent from the team's already-verified domain, not a new ic.cleanenergyfund.ng
// one — Resend's free plan only allows one verified sending domain, and the
// display name is set per-send to whoever's actually writing the email.
const SEND_DOMAIN = 'updates.fundco.ng';

function validateEmails(label, emails) {
  if (!Array.isArray(emails) || !emails.length) {
    throw Object.assign(new Error(`${label} must include at least one email address`), { status: 400 });
  }
}

function assertAllowedRecipients(toEmails) {
  if (!env.icEmailAllowedRecipients.length) return;
  const blocked = toEmails.filter((email) => !env.icEmailAllowedRecipients.includes(email.toLowerCase()));
  if (blocked.length) {
    throw Object.assign(
      new Error(
        `While testing on this environment, IC emails can only be sent to allowed test addresses. Not allowed: ${blocked.join(', ')}`
      ),
      { status: 400 }
    );
  }
}

async function sendEmail({ matterId, toEmails, subject, body }, user) {
  validateEmails('toEmails', toEmails);
  if (!subject) throw Object.assign(new Error('subject is required'), { status: 400 });
  if (!body) throw Object.assign(new Error('body is required'), { status: 400 });
  assertAllowedRecipients(toEmails);

  const senderName = user.name || user.email;
  const ccEmails = [user.email];

  const { data, error: sendError } = await resend.emails.send({
    from: `${senderName} <ic@${SEND_DOMAIN}>`,
    to: toEmails,
    cc: ccEmails,
    replyTo: user.email,
    subject,
    text: body,
  });
  if (sendError) {
    logger.error('IC email failed to send', { subject, error: sendError.message || sendError });
  }

  const { data: record, error: insertError } = await supabase
    .from('ic_emails')
    .insert({
      matter_id: matterId || null,
      sender_user_id: user.id,
      sender_email: user.email,
      sender_name: senderName,
      to_emails: toEmails,
      cc_emails: ccEmails,
      subject,
      body,
      resend_message_id: data?.id || null,
      send_error: sendError ? sendError.message || String(sendError) : null,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_EMAIL_SENT',
    entityType: matterId ? 'ic_matter' : 'ic_email',
    entityId: matterId || record.id,
    details: { toEmails, subject, failed: Boolean(sendError) },
  });

  if (sendError) {
    throw Object.assign(new Error('The email could not be delivered. It has been logged, but was not sent.'), { status: 502 });
  }

  return record;
}

async function listEmails({ matterId } = {}) {
  let query = supabase.from('ic_emails').select('*').order('sent_at', { ascending: false });
  if (matterId) query = query.eq('matter_id', matterId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

module.exports = { sendEmail, listEmails };
