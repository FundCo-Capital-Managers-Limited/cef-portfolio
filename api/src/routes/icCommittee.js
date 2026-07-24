const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireIcAccess } = require('../middleware/requireRole');
const icCommitteeController = require('../controllers/icCommitteeController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireIcAccess);

router.get('/', icCommitteeController.list);
router.get('/candidates', icCommitteeController.candidates);
router.post('/', icCommitteeController.add);
router.patch('/:id', icCommitteeController.update);
router.delete('/:id', icCommitteeController.remove);

module.exports = router;
