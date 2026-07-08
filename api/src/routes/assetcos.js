const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { list, getOne, create, update, changeStage } = require('../controllers/assetcosController');
const infracreditController = require('../controllers/infracreditController');
const seriesController = require('../controllers/seriesController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.patch('/:id', update);
router.put('/:id/stage', changeStage);

router.get('/:id/infracredit', infracreditController.get);
router.post('/:id/infracredit', infracreditController.create);
router.put('/:id/infracredit', infracreditController.update);

router.get('/:id/series', seriesController.seriesForAssetco);
router.post('/:id/series', seriesController.linkToSeries);

module.exports = router;
