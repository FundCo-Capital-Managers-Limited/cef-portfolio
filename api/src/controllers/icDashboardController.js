const icDashboardService = require('../services/icDashboardService');

async function getSummary(req, res, next) {
  try {
    const summary = await icDashboardService.getSummary(req.user);
    res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
