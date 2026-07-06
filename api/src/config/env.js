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
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  resendApiKey: required('RESEND_API_KEY'),
  alertRecipients: (process.env.ALERT_RECIPIENT_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean),
};
