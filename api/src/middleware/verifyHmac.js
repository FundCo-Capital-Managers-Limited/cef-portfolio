const crypto = require('crypto');
const supabase = require('../config/supabase');

const SIGNATURE_HEADER = 'x-cef-signature';
const ASSETCO_HEADER = 'x-cef-assetco-id';

/**
 * Verifies the HMAC-SHA256 signature of the raw request body against the
 * AssetCo's registered secret. Requires express.json({ verify }) to have
 * captured the raw bytes onto req.rawBody (see app.js) — signing must happen
 * over the exact bytes sent, not a re-serialized object.
 */
async function verifyHmac(req, res, next) {
  try {
    const assetCoId = req.get(ASSETCO_HEADER);
    const signature = req.get(SIGNATURE_HEADER);

    if (!assetCoId || !signature) {
      return res.status(400).json({ error: `Missing ${ASSETCO_HEADER} or ${SIGNATURE_HEADER} header` });
    }

    const { data: assetco, error } = await supabase
      .from('assetcos')
      .select('id, hmac_secret, is_active')
      .eq('id', assetCoId)
      .maybeSingle();

    if (error) throw error;
    if (!assetco || !assetco.is_active) {
      return res.status(401).json({ error: 'Unknown or inactive AssetCo' });
    }

    const expected = crypto
      .createHmac('sha256', assetco.hmac_secret)
      .update(req.rawBody || Buffer.from(''))
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');

    const isValid =
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    req.assetCoId = assetCoId;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { verifyHmac, SIGNATURE_HEADER, ASSETCO_HEADER };
