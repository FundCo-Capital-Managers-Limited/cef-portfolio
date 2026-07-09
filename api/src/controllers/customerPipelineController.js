const { canAccessAssetco } = require('../middleware/requireRole');
const customerPipelineService = require('../services/customerPipelineService');

async function summary(req, res, next) {
  try {
    if (!canAccessAssetco(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Cannot access this AssetCo' });
    }
    const result = await customerPipelineService.getSummary(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function pipeline(req, res, next) {
  try {
    if (!canAccessAssetco(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Cannot access this AssetCo' });
    }
    const customers = await customerPipelineService.getPipelineCustomers(req.params.id, {
      status: req.query.status,
      state: req.query.state,
    });
    return res.status(200).json({ customers });
  } catch (err) {
    return next(err);
  }
}

function canWriteCustomerStatus(user, assetCoId) {
  if (['management', 'it_admin'].includes(user.role)) return true;
  return user.role === 'assetco_admin' && user.assetcoId === assetCoId;
}

async function updateStatus(req, res, next) {
  try {
    const customer = await customerPipelineService.getCustomer(req.params.customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!canWriteCustomerStatus(req.user, customer.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, or the AssetCo\'s own admin can update customer status' });
    }

    const updated = await customerPipelineService.updateStatus(
      req.params.customerId,
      req.body.status,
      req.body.notes,
      req.user
    );
    return res.status(200).json({ customer: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { summary, pipeline, updateStatus };
