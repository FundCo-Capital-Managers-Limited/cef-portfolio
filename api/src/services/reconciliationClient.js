/**
 * Client for the pull-based reconciliation calls CEF-PIP makes against each
 * AssetCo's mandatory reconciliation endpoints (architecture doc §7.3). Uses
 * Node's built-in fetch (Node 20+) — no extra HTTP dependency needed for
 * three simple GET calls.
 */

async function callAssetCo(assetco, path) {
  const url = `${assetco.base_url.replace(/\/$/, '')}${path}`;
  const headers = {};
  if (assetco.reconciliation_token) {
    headers.Authorization = `Bearer ${assetco.reconciliation_token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${assetco.id}: ${path} returned ${response.status}`);
  }
  return response.json();
}

function fetchRemoteAssets(assetco) {
  return callAssetCo(assetco, '/cef/assets');
}

function fetchRemotePayments(assetco, { from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return callAssetCo(assetco, `/cef/payments${qs ? `?${qs}` : ''}`);
}

function fetchRemoteFaults(assetco, { status } = {}) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return callAssetCo(assetco, `/cef/faults${qs}`);
}

module.exports = { fetchRemoteAssets, fetchRemotePayments, fetchRemoteFaults };
