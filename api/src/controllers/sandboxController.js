const env = require('../config/env');
const sandboxService = require('../services/sandboxService');

async function reset(req, res, next) {
  try {
    // Two independent guards: nodeEnv is a hard block that can never be
    // overridden by the opt-in flag (belt and suspenders in case
    // SANDBOX_RESET_ENABLED is ever accidentally set on the real prod
    // service), and sandboxResetEnabled means every other environment is
    // disabled by default until explicitly turned on.
    if (env.nodeEnv === 'production' || !env.sandboxResetEnabled) {
      return res.status(404).json({ error: 'Not found' });
    }
    await sandboxService.resetSandboxData(req.assetCoId);
    return res.status(200).json({ status: 'reset' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { reset };
