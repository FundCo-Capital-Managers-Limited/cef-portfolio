const passwordResetService = require('../services/passwordResetService');
const userService = require('../services/userService');

async function forgotPassword(req, res, next) {
  try {
    await passwordResetService.requestPasswordReset(req.body.email);
    // Always the same response, whether or not an email was actually sent —
    // avoids leaking which addresses are provisioned or on the dev allowlist.
    res.status(200).json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changeOwnPassword(req.user, currentPassword, newPassword);
    res.status(200).json({ message: 'Password changed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { forgotPassword, changePassword };
