const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireRole } = require('../middleware/requireRole');
const usersController = require('../controllers/usersController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireRole('it_admin', 'management'));
router.get('/', usersController.list);
router.post('/', usersController.create);

module.exports = router;
