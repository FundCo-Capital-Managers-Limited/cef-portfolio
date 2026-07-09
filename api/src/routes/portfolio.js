const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { loanBook } = require('../controllers/facilityController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/loan-book', loanBook);

module.exports = router;
