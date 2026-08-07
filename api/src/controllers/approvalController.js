const approvalService = require('../services/approvalService');
const { toCsv } = require('../utils/csv');

const APPROVAL_TRAIL_CSV_COLUMNS = [
  { label: 'Requested At', value: (r) => r.created_at },
  { label: 'Action', value: (r) => r.action_type },
  { label: 'Requested By', value: (r) => r.requested_by_email },
  { label: 'Status', value: (r) => r.status },
  { label: 'Decided By', value: (r) => r.decided_by_email || '' },
  { label: 'Decided At', value: (r) => r.decided_at || '' },
  { label: 'Notes', value: (r) => r.decision_notes || '' },
];

async function report(req, res, next) {
  try {
    const requests = await approvalService.listAll();
    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
}

async function exportReportCsv(req, res, next) {
  try {
    const requests = await approvalService.listAll();
    const csv = toCsv(requests, APPROVAL_TRAIL_CSV_COLUMNS);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cef-approval-trail-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    return next(err);
  }
}

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

module.exports = { list, approve, reject, report, exportReportCsv };
