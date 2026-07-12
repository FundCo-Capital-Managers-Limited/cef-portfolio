const supabase = require('../config/supabase');
const resend = require('../config/resend');
const env = require('../config/env');
const logger = require('../utils/logger');

const FROM_ADDRESS = 'CEF-PIP <alerts@updates.fundco.ng>';

/**
 * Sends a password-reset email via Resend (not Supabase's own auth email —
 * this repo already has Resend configured for alerts, and self-hosting the
 * email means no dependency on Supabase's SMTP setup). The recovery link
 * itself still comes from Supabase (auth.admin.generateLink), so the
 * /reset-password page's session-from-URL handling is unchanged.
 *
 * While still testing on the dev environment, delivery is restricted to
 * env.passwordResetAllowedRecipients (currently just it@fundco.ng) so
 * exercising this flow doesn't email real inboxes at the fundco.ng domain
 * for accounts nobody's actually watching yet. The response is identical
 * either way — whether or not an email actually goes out — so this never
 * reveals which addresses are provisioned.
 */
async function requestPasswordReset(email) {
  if (!email) throw Object.assign(new Error('email is required'), { status: 400 });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${env.frontendUrl}/reset-password` },
  });

  if (error) {
    // Supabase returns an error for unknown emails too — log it, but don't
    // leak that distinction to the caller (same response either way).
    logger.warn('Password reset link generation failed', { email, error: error.message });
    return;
  }

  const allowlist = env.passwordResetAllowedRecipients;
  if (allowlist.length && !allowlist.includes(email.toLowerCase())) {
    logger.info('Password reset requested but recipient is outside the dev allowlist — email not sent', { email });
    return;
  }

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Reset your CEF-PIP password',
    text: `A password reset was requested for your CEF-PIP account.\n\nReset it here: ${data.properties.action_link}\n\nIf you didn't request this, you can ignore this email.`,
  });
  if (sendError) {
    logger.error('Password reset email failed to send', { email, error: sendError.message || sendError });
    return;
  }

  logger.info('Password reset email sent', { email });
}

module.exports = { requestPasswordReset };
