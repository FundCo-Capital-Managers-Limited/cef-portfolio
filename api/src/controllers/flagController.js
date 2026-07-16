const flagService = require('../services/flagService');

async function create(req, res, next) {
  try {
    const { entityType, entityId, assetcoId, title, description } = req.body;
    const flag = await flagService.createFlag({ entityType, entityId, assetcoId, title, description }, req.user);
    res.status(201).json({ flag });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const flags = await flagService.listFlags();
    res.status(200).json({ flags });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const flag = await flagService.getFlag(req.params.id);
    await flagService.recordView(req.params.id, req.user);
    // Merge the view just recorded into the response locally rather than
    // re-querying - so the viewer sees themselves in "who's seen this"
    // immediately, on this same request, not only on their next load.
    if (!flag.views.some((v) => v.user_id === req.user.id)) {
      flag.views.push({ flag_id: req.params.id, user_id: req.user.id, viewed_at: new Date().toISOString() });
    }
    res.status(200).json({ flag });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const comment = await flagService.addComment(req.params.id, req.body.body, req.user);
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const flag = await flagService.updateStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({ flag });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get, addComment, updateStatus };
