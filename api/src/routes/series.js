const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { listAll, assetcosInSeries } = require('../controllers/seriesController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/', listAll);
router.get('/:code/assetcos', assetcosInSeries);

module.exports = router;
