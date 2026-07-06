const crypto = require('crypto');
const env = require('../config/env');

/**
 * Guards manually-triggered internal operations (e.g. running reconciliation
 * outside its cron schedule) that aren't part of the AssetCo-facing API and
 * so aren't HMAC-signed. Not meant to be a strong auth boundary — just enough
 * to keep this off the public internet unauthenticated.
 */
function verifyInternalToken(req, res, next) {
  if (!env.internalTriggerToken) {
    return res.status(503).json({ error: 'INTERNAL_TRIGGER_TOKEN not configured' });
  }

  const provided = req.get('x-internal-token') || '';
  const expected = env.internalTriggerToken;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  const isValid =
    providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid internal token' });
  }

  next();
}

module.exports = verifyInternalToken;
