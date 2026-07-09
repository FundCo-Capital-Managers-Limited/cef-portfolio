const { canManageAssetco } = require('../middleware/requireRole');
const manualEntryService = require('../services/manualEntryService');

function requirePermission(req, res, assetCoId) {
  if (!canManageAssetco(req.user, assetCoId)) {
    res.status(403).json({ error: 'Only CEF Management, IT Admin, or the AssetCo\'s own admin can submit manual data' });
    return false;
  }
  return true;
}

async function createCustomer(req, res, next) {
  try {
    if (!requirePermission(req, res, req.body.assetCoId)) return undefined;
    if (!req.body.assetCoId || !req.body.customerName) {
      return res.status(400).json({ error: 'assetCoId and customerName are required' });
    }
    const customer = await manualEntryService.createCustomer(req.body, req.user);
    return res.status(201).json({ customer });
  } catch (err) {
    return next(err);
  }
}

async function createAsset(req, res, next) {
  try {
    if (!requirePermission(req, res, req.body.assetCoId)) return undefined;
    if (!req.body.assetCoId || !req.body.customerId) {
      return res.status(400).json({ error: 'assetCoId and customerId are required' });
    }
    const asset = await manualEntryService.createAsset(req.body, req.user);
    return res.status(201).json({ asset });
  } catch (err) {
    return next(err);
  }
}

async function createPayment(req, res, next) {
  try {
    if (!requirePermission(req, res, req.body.assetCoId)) return undefined;
    const { assetCoId, assetId, amount, status, period } = req.body;
    if (!assetCoId || !assetId || typeof amount !== 'number' || !status || !period) {
      return res.status(400).json({ error: 'assetCoId, assetId, amount, status, and period are required' });
    }
    if (!['RECEIVED', 'MISSED'].includes(status)) {
      return res.status(400).json({ error: "status must be 'RECEIVED' or 'MISSED'" });
    }
    const payment = await manualEntryService.createPayment(req.body, req.user);
    return res.status(201).json({ payment });
  } catch (err) {
    return next(err);
  }
}

async function createFault(req, res, next) {
  try {
    if (!requirePermission(req, res, req.body.assetCoId)) return undefined;
    if (!req.body.assetCoId || !req.body.assetId || !req.body.faultDescription) {
      return res.status(400).json({ error: 'assetCoId, assetId, and faultDescription are required' });
    }
    const fault = await manualEntryService.createFault(req.body, req.user);
    return res.status(201).json({ fault });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createCustomer, createAsset, createPayment, createFault };
