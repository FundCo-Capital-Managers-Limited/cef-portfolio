const userService = require('../services/userService');

async function list(req, res, next) {
  try {
    const users = await userService.listUsers();
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { email, role, assetcoId } = req.body;
    const { user, tempPassword } = await userService.createUser({ email, role, assetcoId, createdBy: req.user });
    res.status(201).json({ user, tempPassword });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { user, tempPassword } = await userService.resetUserPassword(req.params.id, req.user);
    res.status(200).json({ user, tempPassword });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, resetPassword };
