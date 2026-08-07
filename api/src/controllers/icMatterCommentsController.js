const icMatterCommentService = require('../services/icMatterCommentService');

async function create(req, res, next) {
  try {
    const comment = await icMatterCommentService.addComment(req.params.matterId, req.body.body, req.user);
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function listForMatter(req, res, next) {
  try {
    const comments = await icMatterCommentService.listComments(req.params.matterId);
    res.status(200).json({ comments });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listForMatter };
