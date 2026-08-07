const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { loanBook, riskSummary, exportLoanBookCsv } = require('../controllers/facilityController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/loan-book', loanBook);
router.get('/loan-book/export', exportLoanBookCsv);
router.get('/risk-summary', riskSummary);

module.exports = router;
