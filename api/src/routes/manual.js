const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { createCustomer, createAsset, createPayment, createFault } = require('../controllers/manualEntryController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.post('/customers', createCustomer);
router.post('/assets', createAsset);
router.post('/payments', createPayment);
router.post('/faults', createFault);

module.exports = router;
