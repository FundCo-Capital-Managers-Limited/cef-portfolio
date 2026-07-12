const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Public — a locked-out user isn't logged in yet.
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
