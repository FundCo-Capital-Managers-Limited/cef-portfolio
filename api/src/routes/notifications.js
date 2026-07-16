const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { getUnreadCount, getRecent, markSeen, listMine, myUnreadCount, markOneRead } = require('../controllers/notificationsController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.get('/unread-count', getUnreadCount);
router.get('/recent', getRecent);
router.post('/mark-seen', markSeen);

// Per-recipient, targeted notifications (flags etc.) - distinct from the
// audit_log-cursor bell above.
router.get('/mine', listMine);
router.get('/mine/unread-count', myUnreadCount);
router.post('/mine/:id/read', markOneRead);

module.exports = router;
