const { createRemoteJWKSet, jwtVerify } = require('jose');
const env = require('../config/env');

// Cached remote JWKS client — jose handles fetching + key rotation + caching
// internally, so this only hits the network on cache miss/expiry.
let jwks;
function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(env.supabaseJwksUrl));
  }
  return jwks;
}

/**
 * Verifies a Supabase-issued access token (dashboard user session, not an
 * AssetCo webhook — those are HMAC-verified separately). Returns the JWT
 * payload on success; throws on an invalid/expired/malformed token.
 */
async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, getJwks(), {
    audience: 'authenticated',
  });
  return payload;
}

module.exports = { verifyAccessToken };
