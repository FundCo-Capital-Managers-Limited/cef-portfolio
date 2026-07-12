const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { listAll, assetcosInSeries, create, update, remove } = require('../controllers/seriesController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/', listAll);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
router.get('/:code/assetcos', assetcosInSeries);

module.exports = router;
