/**
 * Minimal structured logger. Most services in this codebase previously only
 * logged on failure (processing_error column, thrown errors) — this adds
 * visibility into the success path too (event processed, alert sent,
 * reconciliation ran) so "what is the backend actually doing" is answerable
 * from Render's log stream without attaching a debugger.
 *
 * Silent in tests (NODE_ENV=test) to keep Jest output clean — this mirrors
 * how morgan request logging is already skipped in app.js.
 */
const env = require('../config/env');

function write(level, message, meta) {
  if (env.nodeEnv === 'test') return;
  const line = { level, message, ...meta, timestamp: new Date().toISOString() };
  // eslint-disable-next-line no-console
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  out(JSON.stringify(line));
}

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
