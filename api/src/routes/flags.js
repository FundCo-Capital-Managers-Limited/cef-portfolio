const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireRole, CEF_WIDE_ROLES } = require('../middleware/requireRole');
const flagController = require('../controllers/flagController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireRole(...CEF_WIDE_ROLES));

router.get('/', flagController.list);
router.post('/', flagController.create);
router.get('/:id', flagController.get);
router.post('/:id/comments', flagController.addComment);
router.patch('/:id/status', flagController.updateStatus);

module.exports = router;
