const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { loanBook, riskSummary } = require('../controllers/facilityController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/loan-book', loanBook);
router.get('/risk-summary', riskSummary);

module.exports = router;
