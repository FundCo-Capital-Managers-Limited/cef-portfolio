const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireRole } = require('../middleware/requireRole');
const applicationsController = require('../controllers/applicationsController');

const router = express.Router();

// Public — a prospective AssetCo submits without being logged in.
router.post('/', applicationsController.submit);

// Everything else is CEF-staff review, per the mid-sprint spec ("IT,
// management, and executives review and progress applications").
router.use(verifySupabaseAuth);
router.get('/', requireRole('executive', 'management', 'it_admin'), applicationsController.list);
router.get('/:id', requireRole('executive', 'management', 'it_admin'), applicationsController.getOne);
router.put('/:id/review', requireRole('executive', 'management', 'it_admin'), applicationsController.review);

module.exports = router;
