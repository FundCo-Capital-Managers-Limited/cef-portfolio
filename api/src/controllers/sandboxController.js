const env = require('../config/env');
const sandboxService = require('../services/sandboxService');

async function reset(req, res, next) {
  try {
    if (env.nodeEnv === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    await sandboxService.resetSandboxData(req.assetCoId);
    return res.status(200).json({ status: 'reset' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { reset };
