const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { getUnreadCount, getRecent, markSeen } = require('../controllers/notificationsController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/unread-count', getUnreadCount);
router.get('/recent', getRecent);
router.post('/mark-seen', markSeen);

module.exports = router;
