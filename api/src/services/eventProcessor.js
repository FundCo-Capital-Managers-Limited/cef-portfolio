const {
  handlePaymentReceived,
  handlePaymentMissed,
  handlePaymentDefaulted,
  handleFaultDetected,
  handleFaultResolved,
} = require('./cashflowEngine');

const {
  handleCustomerCreated,
  handleAssetCreated,
  handleAssetDeployed,
  handleAssetDecommissioned,
  handleSyncHeartbeat,
} = require('./assetRegistry');

const logger = require('../utils/logger');

const HANDLERS = {
  'customer.created': handleCustomerCreated,
  'asset.created': handleAssetCreated,
  'asset.deployed': handleAssetDeployed,
  'asset.decommissioned': handleAssetDecommissioned,
  'payment.received': handlePaymentReceived,
  'payment.missed': handlePaymentMissed,
  'payment.defaulted': handlePaymentDefaulted,
  'asset.fault.detected': handleFaultDetected,
  'asset.fault.resolved': handleFaultResolved,
  'sync.heartbeat': handleSyncHeartbeat,
};

/**
 * Dispatches a stored event to its Asset Registry/Cashflow/Alert Engine handler,
 * if one exists. Event types without a handler (asset.disabled, asset.enabled,
 * telemetry.updated, rider.inactive) are accepted and stored by the ingestion
 * endpoint but have no further processing yet — those are Phase 2 (control
 * actions, telemetry, SSM-specific handling).
 */
async function processEvent(payload, eventId) {
  const handler = HANDLERS[payload.eventType];
  if (!handler) {
    logger.info('Event stored with no processing handler (Phase 2 event type)', { eventId, eventType: payload.eventType });
    return;
  }
  await handler(payload, eventId);
}

module.exports = { processEvent };
