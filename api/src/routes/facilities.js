const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const facilityController = require('../controllers/facilityController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.post('/', facilityController.create);
router.get('/:id', facilityController.getOne);
router.patch('/:id', facilityController.update);
router.patch('/:id/status', facilityController.changeStatus);
router.post('/:id/repayments', facilityController.recordRepayment);
router.get('/:id/repayments', facilityController.repaymentHistory);

module.exports = router;
