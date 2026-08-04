const icVotingService = require('../services/icVotingService');

async function declareConflict(req, res, next) {
  try {
    const declaration = await icVotingService.declareConflict(req.params.meetingId, req.params.matterId, req.body.reason, req.user);
    res.status(201).json({ declaration });
  } catch (err) {
    next(err);
  }
}

async function listConflicts(req, res, next) {
  try {
    const conflicts = await icVotingService.listConflicts(req.params.meetingId, req.params.matterId);
    res.status(200).json({ conflicts });
  } catch (err) {
    next(err);
  }
}

async function castVote(req, res, next) {
  try {
    const vote = await icVotingService.castVote(req.params.meetingId, req.params.matterId, req.body.value, req.user);
    res.status(200).json({ vote });
  } catch (err) {
    next(err);
  }
}

async function getVoteSummary(req, res, next) {
  try {
    const summary = await icVotingService.getVoteSummary(req.params.meetingId, req.params.matterId);
    res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

async function recordDecision(req, res, next) {
  try {
    const decision = await icVotingService.recordDecision(req.params.meetingId, req.params.matterId, req.body.outcome, req.user);
    res.status(201).json({ decision });
  } catch (err) {
    next(err);
  }
}

module.exports = { declareConflict, listConflicts, castVote, getVoteSummary, recordDecision };
