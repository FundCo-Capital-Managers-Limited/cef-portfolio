const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icConditionsController = require('../controllers/icConditionsController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireIcAccess);

router.get('/', icConditionsController.listAll);
router.patch('/:id', icConditionsController.update);

module.exports = router;
