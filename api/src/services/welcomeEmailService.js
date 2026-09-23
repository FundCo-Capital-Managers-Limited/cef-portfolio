const resend = require('../config/resend');
const env = require('../config/env');
const logger = require('../utils/logger');

const FROM_ADDRESS = 'CEF-PIP <alerts@updates.fundco.ng>';

function credentialsEmailBody({ introLine, email, tempPassword }) {
  const loginUrl = `${env.frontendUrl}/login`;
  return `${introLine}\n\nSign in here: ${loginUrl}\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nThis password is shown to you only once — please change it after you sign in.`;
}

/**
 * Emails a newly created account its login details (this repo already sends
 * password resets the same way — see passwordResetService.js — for the same
 * reason: Resend is already configured for alerts, no dependency on
 * Supabase's own SMTP setup). Sent as a side effect of userService.createUser
 * — deliberately fire-and-forget: a failed send never fails account
 * creation, since the admin-facing response already shows the temp password
 * on screen as the fallback way to hand it over (see UserManagementPanel.js).
 *
 * Gated by its own allowlist (env.welcomeEmailAllowedRecipients), separate
 * from passwordResetAllowedRecipients — same "don't email real inboxes for
 * dev/test accounts nobody's watching yet" reasoning, but a distinct list
 * since who should receive a welcome email and who should receive a reset
 * link aren't necessarily the same people. Empty means no restriction.
 */
async function sendWelcomeEmail({ email, role, tempPassword }) {
  const allowlist = env.welcomeEmailAllowedRecipients;
  if (allowlist.length && !allowlist.includes(email.toLowerCase())) {
    logger.info('Account created but recipient is outside the welcome-email allowlist — email not sent', { email });
    return;
  }

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Your CEF-PIP account',
    text: credentialsEmailBody({
      introLine: `An account has been created for you on CEF-PIP (role: ${role}).`,
      email,
      tempPassword,
    }),
  });
  if (sendError) {
    logger.error('Welcome email failed to send', { email, error: sendError.message || sendError });
    return;
  }

  logger.info('Welcome email sent', { email });
}

/**
 * Admin-triggered, explicit send — the "Send to user" button next to Reset
 * Password in the admin panel (UserManagementPanel.js). Unlike
 * sendWelcomeEmail's automatic, fire-and-forget send, this is a deliberate,
 * single-recipient action an admin chose to take, so a blocked or failed
 * send throws instead of silently no-op'ing — same reasoning
 * icEmailService already applies to its own allowlist (a tool that lets
 * someone actively choose who to email shouldn't fail silently).
 */
async function sendPasswordResetCredentialsEmail({ email, tempPassword }) {
  const allowlist = env.welcomeEmailAllowedRecipients;
  if (allowlist.length && !allowlist.includes(email.toLowerCase())) {
    throw Object.assign(new Error(`${email} is outside the configured welcome-email allowlist — not sent`), { status: 403 });
  }

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Your CEF-PIP password has been reset',
    text: credentialsEmailBody({
      introLine: 'An administrator has reset the password on your CEF-PIP account.',
      email,
      tempPassword,
    }),
  });
  if (sendError) {
    throw Object.assign(new Error(sendError.message || 'Failed to send email'), { status: 502 });
  }

  logger.info('Password reset credentials emailed', { email });
}

module.exports = { sendWelcomeEmail, sendPasswordResetCredentialsEmail };
