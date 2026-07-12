// Sample payloads for every CEF Integration Standard (CIS) event type.
// assetCoId and timestamp are filled in at send time by send-event.js — the
// customerId/assetId here are shared across events so running `--all`
// produces one coherent story (a customer and asset created, deployed, an
// on-time payment, a missed one, a fault detected then resolved).

const SAMPLE_CUSTOMER_ID = 'CUS-SAMPLE-0001';
const SAMPLE_ASSET_ID = 'AST-SAMPLE-0001';

const BUILDERS = {
  'customer.created': () => ({
    customerId: SAMPLE_CUSTOMER_ID,
    status: 'PIPELINE',
    metadata: { name: 'Sample Customer' },
    expectedMonthlyPaymentNgn: 55000,
    contractTermMonths: 24,
    locationState: 'Lagos',
    locationLga: 'Ikeja',
    customerSegment: 'RESIDENTIAL',
  }),

  'asset.created': () => ({
    assetId: SAMPLE_ASSET_ID,
    customerId: SAMPLE_CUSTOMER_ID,
    assetType: 'Solar Home System',
    equipmentSpec: '100kWp Solar Panel Array',
    oemModel: 'SunPower X1',
    oemManufacturer: 'SunPower',
    ownershipModel: 'LEASE_TO_OWN',
    remoteControlSupported: false,
    oemRemoteControlApiAvailable: false,
  }),

  'asset.deployed': () => ({
    assetId: SAMPLE_ASSET_ID,
    customerId: SAMPLE_CUSTOMER_ID,
    assetType: 'Solar Home System',
    equipmentSpec: '100kWp Solar Panel Array',
    ownershipModel: 'LEASE_TO_OWN',
  }),

  'asset.decommissioned': () => ({
    assetId: SAMPLE_ASSET_ID,
  }),

  'payment.received': () => ({
    assetId: SAMPLE_ASSET_ID,
    customerId: SAMPLE_CUSTOMER_ID,
    amount: 55000,
    currency: 'NGN',
    sourceRef: `SAMPLE-PMT-${Date.now()}`,
  }),

  'payment.missed': () => ({
    assetId: SAMPLE_ASSET_ID,
    customerId: SAMPLE_CUSTOMER_ID,
    amount: 55000,
    currency: 'NGN',
  }),

  'payment.defaulted': () => ({
    assetId: SAMPLE_ASSET_ID,
    customerId: SAMPLE_CUSTOMER_ID,
    amount: 55000,
    currency: 'NGN',
  }),

  'asset.fault.detected': () => ({
    assetId: SAMPLE_ASSET_ID,
    metadata: { code: 'INVERTER_OFFLINE' },
  }),

  'asset.fault.resolved': () => ({
    assetId: SAMPLE_ASSET_ID,
  }),

  'asset.disabled': () => ({
    assetId: SAMPLE_ASSET_ID,
  }),

  'asset.enabled': () => ({
    assetId: SAMPLE_ASSET_ID,
  }),

  'telemetry.updated': () => ({
    assetId: SAMPLE_ASSET_ID,
    metadata: { batteryLevelPercent: 87 },
  }),

  'rider.inactive': () => ({
    assetId: SAMPLE_ASSET_ID,
  }),

  'sync.heartbeat': () => ({}),
};

const EVENT_TYPES = Object.keys(BUILDERS);

// A sensible order for `--all`: establish the customer and asset before
// anything that references them, then payments/faults, then a heartbeat.
const ALL_ORDER = [
  'customer.created',
  'asset.created',
  'asset.deployed',
  'payment.received',
  'payment.missed',
  'payment.defaulted',
  'asset.fault.detected',
  'asset.fault.resolved',
  'asset.disabled',
  'asset.enabled',
  'telemetry.updated',
  'rider.inactive',
  'asset.decommissioned',
  'sync.heartbeat',
];

function buildPayload(eventType, assetCoId) {
  const builder = BUILDERS[eventType];
  if (!builder) {
    throw new Error(`Unknown eventType "${eventType}". Valid types: ${EVENT_TYPES.join(', ')}`);
  }
  return {
    eventType,
    assetCoId,
    timestamp: new Date().toISOString(),
    ...builder(),
  };
}

module.exports = { buildPayload, EVENT_TYPES, ALL_ORDER };
