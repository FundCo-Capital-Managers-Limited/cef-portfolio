require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.warn(`[config] missing env var ${name}`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL || `${process.env.SUPABASE_URL || ''}/auth/v1/.well-known/jwks.json`,
  // Comma-separated list of exact origins allowed to call this API from a
  // browser (the dashboard's Vercel URL(s) — production and, optionally, a
  // stable staging alias). Empty means "no restriction" — fine for local
  // dev, but every deployed environment should set this, since the API is
  // otherwise reachable cross-origin from any web page (webhooks and
  // server-to-server calls are unaffected either way — CORS only governs
  // browser requests).
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  resendApiKey: required('RESEND_API_KEY'),
  alertRecipients: (process.env.ALERT_RECIPIENT_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean),
  internalTriggerToken: process.env.INTERNAL_TRIGGER_TOKEN,
  // Where the dashboard is served — used to build the password-reset link's
  // redirect target (its own /reset-password page). Defaults to local dev.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  // Comma-separated allowlist for password-reset emails. While the team is
  // still only testing this on the dev environment, this restricts actual
  // delivery to addresses on the list (the request still succeeds either
  // way, to avoid leaking which emails are provisioned) — set once the team
  // is ready for every seeded account to receive real reset emails.
  passwordResetAllowedRecipients: (process.env.PASSWORD_RESET_ALLOWED_RECIPIENTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};
