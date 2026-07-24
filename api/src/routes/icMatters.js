const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icMattersController = require('../controllers/icMattersController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireIcAccess);

router.get('/', icMattersController.list);
router.post('/', icMattersController.create);
router.get('/:id', icMattersController.get);
router.patch('/:id', icMattersController.update);

module.exports = router;
