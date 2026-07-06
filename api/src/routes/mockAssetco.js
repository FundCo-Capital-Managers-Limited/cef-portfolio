const express = require('express');
const { getAssets, getPayments, getFaults } = require('../controllers/mockAssetcoController');

const router = express.Router();

router.get('/:assetCoId/cef/assets', getAssets);
router.get('/:assetCoId/cef/payments', getPayments);
router.get('/:assetCoId/cef/faults', getFaults);

module.exports = router;
