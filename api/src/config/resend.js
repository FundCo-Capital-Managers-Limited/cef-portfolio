const { Resend } = require('resend');
const env = require('./env');

const resend = new Resend(env.resendApiKey || 're_placeholder');

module.exports = resend;
