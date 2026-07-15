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
    const { email, name, role, assetcoId, assetcoIds } = req.body;
    const { user, tempPassword } = await userService.createUser({ email, name, role, assetcoId, assetcoIds, createdBy: req.user });
    res.status(201).json({ user, tempPassword });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { name, role, assetcoId, assetcoIds } = req.body;
    const user = await userService.updateUser(req.params.id, { name, role, assetcoId, assetcoIds }, req.user);
    res.status(200).json({ user });
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

async function setActive(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive (boolean) is required' });
    const user = await userService.setUserActive(req.params.id, isActive, req.user);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, resetPassword, setActive, remove };
