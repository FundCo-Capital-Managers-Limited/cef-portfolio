const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { list, getOne, create, update, changeStage, regenerateSecret } = require('../controllers/assetcosController');
const infracreditController = require('../controllers/infracreditController');
const seriesController = require('../controllers/seriesController');
const customerPipelineController = require('../controllers/customerPipelineController');
const facilityController = require('../controllers/facilityController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.patch('/:id', update);
router.put('/:id/stage', changeStage);
router.post('/:id/regenerate-secret', regenerateSecret);

router.get('/:id/infracredit', infracreditController.get);
router.post('/:id/infracredit', infracreditController.create);
router.put('/:id/infracredit', infracreditController.update);

router.get('/:id/series', seriesController.seriesForAssetco);
router.post('/:id/series', seriesController.linkToSeries);

router.get('/:id/customers/summary', customerPipelineController.summary);
router.get('/:id/customers/pipeline', customerPipelineController.pipeline);

router.get('/:id/facilities', facilityController.listForAssetco);

module.exports = router;
