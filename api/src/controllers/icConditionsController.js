const icConditionService = require('../services/icConditionService');

async function create(req, res, next) {
  try {
    const { decisionId, type, wording, ownerUserId, dueDate } = req.body;
    const condition = await icConditionService.createCondition(req.params.matterId, { decisionId, type, wording, ownerUserId, dueDate }, req.user);
    res.status(201).json({ condition });
  } catch (err) {
    next(err);
  }
}

async function listForMatter(req, res, next) {
  try {
    const conditions = await icConditionService.listConditionsForMatter(req.params.matterId);
    res.status(200).json({ conditions });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { status, wording, ownerUserId, dueDate } = req.body;
    const condition = await icConditionService.updateCondition(req.params.id, { status, wording, ownerUserId, dueDate }, req.user);
    res.status(200).json({ condition });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listForMatter, update };
