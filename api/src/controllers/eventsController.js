const { validateEventPayload } = require('../utils/eventSchema');
const { recordEvent, markProcessed, markProcessingError } = require('../services/eventService');
const { processEvent } = require('../services/eventProcessor');

async function ingestEvent(req, res, next) {
  try {
    const { valid, errors } = validateEventPayload(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid event payload', details: errors });
    }

    if (req.body.assetCoId !== req.assetCoId) {
      return res.status(400).json({ error: 'assetCoId in payload does not match X-CEF-AssetCo-Id header' });
    }

    const event = await recordEvent(req.body);

    // The event is durably stored at this point regardless of what happens next.
    // Processing failures are recorded on the event row rather than surfaced as a
    // 5xx to the AssetCo — a failed handler run is caught by nightly reconciliation,
    // not by making the AssetCo retry a webhook that already succeeded.
    try {
      await processEvent(req.body, event.id);
      await markProcessed(event.id);
    } catch (processingErr) {
      await markProcessingError(event.id, processingErr.message);
    }

    return res.status(200).json({ status: 'accepted', eventId: event.id });
  } catch (err) {
    return next(err);
  }
}

module.exports = { ingestEvent };
