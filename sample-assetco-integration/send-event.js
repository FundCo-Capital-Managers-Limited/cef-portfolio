#!/usr/bin/env node
// Reference sender for CEF-PIP's Event Ingestion API.
//
// Usage:
//   node send-event.js <eventType>     — send one sample event
//   node send-event.js --all           — send every event type in order,
//                                         telling one coherent story
//
// For a UI version of this (individual buttons, trigger-all, mock
// reconciliation endpoints, and a wipe-test-data button), run `node
// server.js` instead and open http://localhost:4100 — see README.md.
//
// Requires Node 18+ (for global fetch). No npm dependencies.

const { buildPayload, EVENT_TYPES, ALL_ORDER } = require('./payloads');
const { loadDotEnv, sign, requireEnv } = require('./common');

loadDotEnv();
const { CEF_API_URL, ASSETCO_ID, HMAC_SECRET } = process.env;

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
