const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { updateStatus } = require('../controllers/customerPipelineController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.patch('/:customerId/status', updateStatus);

module.exports = router;
