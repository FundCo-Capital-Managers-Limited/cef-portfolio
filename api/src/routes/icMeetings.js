const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icMeetingsController = require('../controllers/icMeetingsController');

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

module.exports = router;
