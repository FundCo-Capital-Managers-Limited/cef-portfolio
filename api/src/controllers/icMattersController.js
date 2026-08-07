const icMatterService = require('../services/icMatterService');

async function create(req, res, next) {
  try {
    const { category, decisionType, title, description, assetcoId, dealLeadUserId } = req.body;
    const matter = await icMatterService.createMatter({ category, decisionType, title, description, assetcoId, dealLeadUserId }, req.user);
    res.status(201).json({ matter });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const matters = await icMatterService.listMatters();
    res.status(200).json({ matters });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const matter = await icMatterService.getMatter(req.params.id);
    res.status(200).json({ matter });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { status, decisionType, title, description, dealLeadUserId, delegatedAuthorityStatus, trusteeNoObjectionStatus } = req.body;
    const matter = await icMatterService.updateMatter(
      req.params.id,
      { status, decisionType, title, description, dealLeadUserId, delegatedAuthorityStatus, trusteeNoObjectionStatus },
      req.user
    );
    res.status(200).json({ matter });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get, update };
