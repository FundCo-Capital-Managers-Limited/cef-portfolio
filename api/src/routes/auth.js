const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const authController = require('../controllers/authController');

const router = express.Router();

// Public — a locked-out user isn't logged in yet.
router.post('/forgot-password', authController.forgotPassword);

// Authenticated separately from the router as a whole (not router.use) —
// forgot-password above must stay reachable without a session.
router.post('/change-password', verifySupabaseAuth, authController.changePassword);

module.exports = router;
