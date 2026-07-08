const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { list, getOne, create, update, changeStage } = require('../controllers/assetcosController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.patch('/:id', update);
router.put('/:id/stage', changeStage);

module.exports = router;
