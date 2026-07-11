#!/usr/bin/env node
// Reference sender for CEF-PIP's Event Ingestion API.
//
// Usage:
//   node send-event.js <eventType>     — send one sample event
//   node send-event.js --all           — send every event type in order,
//                                         telling one coherent story
//
// Requires Node 18+ (for global fetch). No npm dependencies.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildPayload, EVENT_TYPES, ALL_ORDER } = require('./payloads');

// Tiny .env loader so this stays dependency-free — reads KEY=VALUE lines,
// ignores blanks/comments, does not overwrite already-set env vars.
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

loadDotEnv();

const { CEF_API_URL, ASSETCO_ID, HMAC_SECRET } = process.env;

function requireEnv() {
  const missing = ['CEF_API_URL', 'ASSETCO_ID', 'HMAC_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in your sandbox credentials.');
    process.exit(1);
  }
}

function sign(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

async function sendEvent(eventType) {
  const payload = buildPayload(eventType, ASSETCO_ID);
  const rawBody = JSON.stringify(payload);
  const signature = sign(rawBody, HMAC_SECRET);

  console.log(`\n→ Sending ${eventType}`);
  console.log(JSON.stringify(payload, null, 2));

  const res = await fetch(`${CEF_API_URL}/api/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CEF-AssetCo-Id': ASSETCO_ID,
      'X-CEF-Signature': signature,
    },
    body: rawBody,
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`✓ ${res.status} accepted — eventId: ${data.eventId}`);
  } else {
    console.error(`✗ ${res.status}`, data);
  }
  return res.ok;
}

async function main() {
  requireEnv();
  const arg = process.argv[2];

  if (!arg) {
    console.error('Usage: node send-event.js <eventType> | --all');
    console.error(`Valid event types: ${EVENT_TYPES.join(', ')}`);
    process.exit(1);
  }

  if (arg === '--all') {
    let allOk = true;
    for (const eventType of ALL_ORDER) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await sendEvent(eventType);
      allOk = allOk && ok;
    }
    process.exit(allOk ? 0 : 1);
  } else {
    const ok = await sendEvent(arg);
    process.exit(ok ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
