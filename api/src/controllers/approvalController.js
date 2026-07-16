const approvalService = require('../services/approvalService');

async function list(req, res, next) {
  try {
    const requests = await approvalService.listForUser(req.user);
    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    if (!approvalService.APPROVER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can approve requests' });
    }
    const request = await approvalService.decide(req.params.id, 'approved', req.user, req.body.notes);
    return res.status(200).json({ request });
  } catch (err) {
    return next(err);
  }
}

async function reject(req, res, next) {
  try {
    if (!approvalService.APPROVER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can reject requests' });
    }
    const request = await approvalService.decide(req.params.id, 'rejected', req.user, req.body.notes);
    return res.status(200).json({ request });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, approve, reject };
