#!/usr/bin/env node
// Web UI for the sample AssetCo integration — lets you trigger individual
// CIS events one at a time, trigger the full --all story, wipe your own
// sandbox test data, and doubles as a running reconciliation endpoint CEF's
// nightly job can call against (see reconciliationMockData.js).
//
// Run: node server.js  (then open http://localhost:4100)
// Requires: npm install (this file needs `express`, unlike send-event.js)

const express = require('express');
const path = require('path');
const { buildPayload, ALL_ORDER } = require('./payloads');
const { getMockAssets, getMockPayments, getMockFaults } = require('./reconciliationMockData');
const { loadDotEnv, sign, requireEnv } = require('./common');

loadDotEnv();
requireEnv();
const { CEF_API_URL, ASSETCO_ID, HMAC_SECRET } = process.env;
// Render (and most PaaS hosts) assign PORT dynamically and expect the app to
// bind to it; SANDBOX_UI_PORT stays as the local-dev override.
const PORT = process.env.PORT || process.env.SANDBOX_UI_PORT || 4100;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/event-types', (req, res) => {
  res.json({ eventTypes: ALL_ORDER, assetCoId: ASSETCO_ID, apiUrl: CEF_API_URL });
});

app.post('/api/trigger', async (req, res) => {
  const { eventType } = req.body;
  try {
    const payload = buildPayload(eventType, ASSETCO_ID);
    const rawBody = JSON.stringify(payload);
    const signature = sign(rawBody, HMAC_SECRET);

    const apiRes = await fetch(`${CEF_API_URL}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CEF-AssetCo-Id': ASSETCO_ID,
        'X-CEF-Signature': signature,
      },
      body: rawBody,
    });
    const data = await apiRes.json().catch(() => ({}));
    res.status(200).json({ ok: apiRes.ok, status: apiRes.status, eventType, payload, response: data });
  } catch (err) {
    res.status(200).json({ ok: false, eventType, error: err.message });
  }
});

app.post('/api/wipe', async (req, res) => {
  try {
    const signature = sign('', HMAC_SECRET);
    const apiRes = await fetch(`${CEF_API_URL}/api/v1/sandbox/reset`, {
      method: 'DELETE',
      headers: {
        'X-CEF-AssetCo-Id': ASSETCO_ID,
        'X-CEF-Signature': signature,
      },
    });
    const data = await apiRes.json().catch(() => ({}));
    res.status(200).json({ ok: apiRes.ok, status: apiRes.status, response: data });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
});

// The reconciliation endpoints this AssetCo (sandbox) exposes — CEF's
// nightly reconciliation job calls these against whatever base_url is on
// file for the AssetCo. Static mock data, no database.
app.get('/cef/assets', (req, res) => res.json(getMockAssets()));
app.get('/cef/payments', (req, res) => res.json(getMockPayments()));
app.get('/cef/faults', (req, res) => res.json(getMockFaults()));

app.listen(PORT, () => {
  console.log(`Sandbox UI running at http://localhost:${PORT}`);
  console.log(`Sending as AssetCo "${ASSETCO_ID}" against ${CEF_API_URL}`);
});
