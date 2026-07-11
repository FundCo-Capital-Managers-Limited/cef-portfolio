// Static, hand-written responses for the reconciliation endpoints every
// AssetCo must expose (see the API Integration Guide, section 4). No
// database here at all — during a walkthrough, point the AssetCo's
// base_url at this sandbox server and CEF-PIP's real nightly reconciliation
// job will call these and get back data shaped exactly like a real
// AssetCo platform would return.

function getMockAssets() {
  return [
    {
      assetId: 'AST-SAMPLE-0001',
      customerId: 'CUS-SAMPLE-0001',
      status: 'deployed',
      deployedAt: '2026-01-15T09:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getMockPayments() {
  return [
    {
      assetId: 'AST-SAMPLE-0001',
      customerId: 'CUS-SAMPLE-0001',
      amount: 55000,
      currency: 'NGN',
      status: 'received',
      sourceRef: 'SAMPLE-PMT-RECONCILE-001',
      occurredAt: '2026-02-01T09:15:00Z',
    },
  ];
}

function getMockFaults() {
  return [
    {
      assetId: 'AST-SAMPLE-0001',
      status: 'open',
      detectedAt: new Date().toISOString(),
    },
  ];
}

module.exports = { getMockAssets, getMockPayments, getMockFaults };
