const express = require('express');
const verifyInternalToken = require('../middleware/verifyInternalToken');
const { runNightlyReconciliation } = require('../services/reconciliationService');

const router = express.Router();

router.post('/run', verifyInternalToken, async (req, res, next) => {
  try {
    const results = await runNightlyReconciliation();
    res.status(200).json({ results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
