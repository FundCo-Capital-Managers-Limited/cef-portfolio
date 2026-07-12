const crypto = require('crypto');

// 32 random bytes as hex — plenty of entropy for an HMAC-SHA256 signing key,
// and hex avoids any character-encoding ambiguity for AssetCos storing/
// copy-pasting it into their own config.
function generateHmacSecret() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateHmacSecret };
