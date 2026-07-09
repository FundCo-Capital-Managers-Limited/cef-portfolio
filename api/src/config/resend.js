const { Resend } = require('resend');
const env = require('./env');

// Never make a real network call in tests, regardless of what a local .env
// happens to have set for RESEND_API_KEY/ALERT_RECIPIENT_EMAILS — a real
// Resend client here previously caused multi-second test timeouts whenever
// several alerts fired in one test (e.g. checkFacilityArrears over many
// overdue schedule rows).
const resend =
  env.nodeEnv === 'test'
    ? { emails: { send: async () => ({ data: null, error: null }) } }
    : new Resend(env.resendApiKey || 're_placeholder');

module.exports = resend;
