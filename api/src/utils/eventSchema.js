const VALID_EVENT_TYPES = [
  'customer.created',
  'asset.created',
  'asset.deployed',
  'asset.decommissioned',
  'payment.received',
  'payment.missed',
  'payment.defaulted',
  'asset.fault.detected',
  'asset.fault.resolved',
  'asset.disabled',
  'asset.enabled',
  'telemetry.updated',
  'rider.inactive',
  'sync.heartbeat',
];

/**
 * Validates the CEF Integration Standard base event payload.
 * Returns { valid: boolean, errors: string[] }
 */
function validateEventPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Payload must be a JSON object'] };
  }

  if (!body.eventType || !VALID_EVENT_TYPES.includes(body.eventType)) {
    errors.push(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }
  if (!body.assetCoId || typeof body.assetCoId !== 'string') {
    errors.push('assetCoId is required and must be a string');
  }
  if (!body.timestamp || Number.isNaN(Date.parse(body.timestamp))) {
    errors.push('timestamp is required and must be a valid ISO 8601 date');
  }

  const moneyEvents = ['payment.received', 'payment.missed', 'payment.defaulted'];
  if (moneyEvents.includes(body.eventType)) {
    if (typeof body.amount !== 'number') errors.push('amount is required for payment events');
    if (!body.currency || typeof body.currency !== 'string') errors.push('currency is required for payment events');
    if (!body.assetId) errors.push('assetId is required for payment events');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateEventPayload, VALID_EVENT_TYPES };
