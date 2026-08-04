const icMinutesService = require('../services/icMinutesService');

async function get(req, res, next) {
  try {
    const minutes = await icMinutesService.getOrCreateMinutes(req.params.meetingId, req.user);
    res.status(200).json({ minutes });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { content, status } = req.body;
    const minutes = await icMinutesService.updateMinutes(req.params.meetingId, { content, status }, req.user);
    res.status(200).json({ minutes });
  } catch (err) {
    next(err);
  }
}

async function lock(req, res, next) {
  try {
    const minutes = await icMinutesService.lockMinutes(req.params.meetingId, req.user);
    res.status(200).json({ minutes });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, update, lock };
