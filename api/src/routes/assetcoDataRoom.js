const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const assetcoDataRoomController = require('../controllers/assetcoDataRoomController');

// Deliberately NOT gated by requireIcAccess — an AssetCo rep never gets
// general IC Engagement portal access. Scoping to their own AssetCo's
// matters happens per-route via canAccessAssetco in the controller instead.
const router = express.Router();

router.use(verifySupabaseAuth);

router.get('/matters', assetcoDataRoomController.listMatters);
router.get('/matters/:matterId/documents', assetcoDataRoomController.listDocuments);
router.post('/matters/:matterId/documents', assetcoDataRoomController.submitDocument);

module.exports = router;
