// Shared between send-event.js (CLI) and server.js (web UI) — the .env
// loader and the HMAC signing logic itself. If you're adapting this into
// your own integration, `sign()` is the one function to carry over
// unchanged regardless of what language/stack you build in.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sign(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function requireEnv() {
  const missing = ['CEF_API_URL', 'ASSETCO_ID', 'HMAC_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in your sandbox credentials.');
    process.exit(1);
  }
}

module.exports = { loadDotEnv, sign, requireEnv };
