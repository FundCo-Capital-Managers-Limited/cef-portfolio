const express = require('express');
const { verifyHmac } = require('../middleware/verifyHmac');
const { ingestEvent } = require('../controllers/eventsController');

const router = express.Router();

router.post('/', verifyHmac, ingestEvent);

module.exports = router;
