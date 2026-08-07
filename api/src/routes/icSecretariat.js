const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icSecretariatController = require('../controllers/icSecretariatController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireIcAccess);

router.get('/', icSecretariatController.getView);

module.exports = router;
