const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { listAll, assetcosInSeries, create, remove } = require('../controllers/seriesController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/', listAll);
router.post('/', create);
router.delete('/:id', remove);
router.get('/:code/assetcos', assetcosInSeries);

module.exports = router;
