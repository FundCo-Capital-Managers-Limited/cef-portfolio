const express = require('express');
const { verifyHmac } = require('../middleware/verifyHmac');
const sandboxController = require('../controllers/sandboxController');

const router = express.Router();

// Same HMAC auth as event submission — req.assetCoId is only ever the
// AssetCo that signed the request, so this can never wipe another
// AssetCo's data. Disabled entirely in production (see controller).
router.delete('/reset', verifyHmac, sandboxController.reset);

module.exports = router;
