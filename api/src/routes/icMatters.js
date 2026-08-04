const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icMattersController = require('../controllers/icMattersController');
const icDocumentsController = require('../controllers/icDocumentsController');
const icConditionsController = require('../controllers/icConditionsController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireIcAccess);

router.get('/', icMattersController.list);
router.post('/', icMattersController.create);
router.get('/:id', icMattersController.get);
router.patch('/:id', icMattersController.update);

router.get('/:matterId/documents', icDocumentsController.listForMatter);
router.post('/:matterId/documents', icDocumentsController.create);

router.get('/:matterId/conditions', icConditionsController.listForMatter);
router.post('/:matterId/conditions', icConditionsController.create);

module.exports = router;
