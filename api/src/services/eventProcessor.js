const {
  handlePaymentReceived,
  handlePaymentMissed,
  handlePaymentDefaulted,
  handleFaultDetected,
  handleFaultResolved,
} = require('./cashflowEngine');

const HANDLERS = {
  'payment.received': handlePaymentReceived,
  'payment.missed': handlePaymentMissed,
  'payment.defaulted': handlePaymentDefaulted,
  'asset.fault.detected': handleFaultDetected,
  'asset.fault.resolved': handleFaultResolved,
};

/**
 * Dispatches a stored event to its Cashflow/Alert Engine handler, if one exists.
 * Event types without a handler (e.g. asset.created, sync.heartbeat) are accepted
 * and stored by the ingestion endpoint but have no further processing yet —
 * those are built out in Week 4 (Asset Registry) and beyond.
 */
async function processEvent(payload, eventId) {
  const handler = HANDLERS[payload.eventType];
  if (!handler) return;
  await handler(payload, eventId);
}

module.exports = { processEvent };
