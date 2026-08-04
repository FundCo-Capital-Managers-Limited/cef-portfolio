const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icDocumentsController = require('../controllers/icDocumentsController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireIcAccess);

router.get('/:id', icDocumentsController.get);
router.patch('/:id', icDocumentsController.update);
router.post('/:id/confirm', icDocumentsController.confirm);

module.exports = router;
