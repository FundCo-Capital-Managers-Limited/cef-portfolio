const icCommitteeService = require('../services/icCommitteeService');

async function list(req, res, next) {
  try {
    const members = await icCommitteeService.listActiveMembers();
    res.status(200).json({ members });
  } catch (err) {
    next(err);
  }
}

async function candidates(req, res, next) {
  try {
    const users = await icCommitteeService.listCandidateUsers();
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

async function add(req, res, next) {
  try {
    const { userId, isChair, isSecretary } = req.body;
    const member = await icCommitteeService.addMember({ userId, isChair, isSecretary }, req.user);
    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { isChair, isSecretary } = req.body;
    const member = await icCommitteeService.updateMember(req.params.id, { isChair, isSecretary }, req.user);
    res.status(200).json({ member });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await icCommitteeService.removeMember(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, candidates, add, update, remove };
