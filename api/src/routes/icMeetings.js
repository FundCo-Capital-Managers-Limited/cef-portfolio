const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icMeetingsController = require('../controllers/icMeetingsController');
const icVotingController = require('../controllers/icVotingController');
const icMinutesController = require('../controllers/icMinutesController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireIcAccess);

router.get('/', icMeetingsController.list);
router.post('/', icMeetingsController.create);
router.get('/default-teams-link', icMeetingsController.defaultTeamsLink);
router.get('/:id', icMeetingsController.get);
router.patch('/:id', icMeetingsController.update);
router.post('/:id/agenda', icMeetingsController.addAgendaItem);
router.delete('/:id/agenda/:itemId', icMeetingsController.removeAgendaItem);

router.get('/:meetingId/matters/:matterId/conflicts', icVotingController.listConflicts);
router.post('/:meetingId/matters/:matterId/conflicts', icVotingController.declareConflict);
router.post('/:meetingId/matters/:matterId/vote', icVotingController.castVote);
router.get('/:meetingId/matters/:matterId/vote-summary', icVotingController.getVoteSummary);
router.post('/:meetingId/matters/:matterId/decision', icVotingController.recordDecision);

router.get('/:meetingId/minutes', icMinutesController.get);
router.patch('/:meetingId/minutes', icMinutesController.update);
router.post('/:meetingId/minutes/lock', icMinutesController.lock);

module.exports = router;
