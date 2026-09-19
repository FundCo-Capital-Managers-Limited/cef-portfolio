const resend = require('../config/resend');
const env = require('../config/env');
const logger = require('../utils/logger');

const FROM_ADDRESS = 'CEF-PIP <alerts@updates.fundco.ng>';

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

  const loginUrl = `${env.frontendUrl}/login`;

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Your CEF-PIP account',
    text: `An account has been created for you on CEF-PIP (role: ${role}).\n\nSign in here: ${loginUrl}\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nThis password is shown to you only once — please change it after you sign in.`,
  });
  if (sendError) {
    logger.error('Welcome email failed to send', { email, error: sendError.message || sendError });
    return;
  }

  logger.info('Welcome email sent', { email });
}

module.exports = { sendWelcomeEmail };
