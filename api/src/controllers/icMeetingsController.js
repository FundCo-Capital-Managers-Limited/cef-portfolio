const icMeetingService = require('../services/icMeetingService');

async function create(req, res, next) {
  try {
    const { meetingDate, teamsLink, chairUserId, secretaryUserId } = req.body;
    const meeting = await icMeetingService.createMeeting({ meetingDate, teamsLink, chairUserId, secretaryUserId }, req.user);
    res.status(201).json({ meeting });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const meetings = await icMeetingService.listMeetings();
    res.status(200).json({ meetings });
  } catch (err) {
    next(err);
  }
}

async function defaultTeamsLink(req, res, next) {
  try {
    const teamsLink = await icMeetingService.getDefaultTeamsLink();
    res.status(200).json({ teamsLink });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const meeting = await icMeetingService.getMeeting(req.params.id);
    res.status(200).json({ meeting });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { status, meetingDate, teamsLink, chairUserId, secretaryUserId } = req.body;
    const meeting = await icMeetingService.updateMeeting(req.params.id, { status, meetingDate, teamsLink, chairUserId, secretaryUserId }, req.user);
    res.status(200).json({ meeting });
  } catch (err) {
    next(err);
  }
}

async function addAgendaItem(req, res, next) {
  try {
    const item = await icMeetingService.addAgendaItem(req.params.id, req.body.matterId, req.body.notes, req.user);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

async function removeAgendaItem(req, res, next) {
  try {
    await icMeetingService.removeAgendaItem(req.params.id, req.params.itemId, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, defaultTeamsLink, get, update, addAgendaItem, removeAgendaItem };
