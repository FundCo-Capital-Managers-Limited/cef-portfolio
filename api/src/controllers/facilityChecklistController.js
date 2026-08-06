const { canAccessAssetco, canManageAssetco } = require('../middleware/requireRole');
const facilityService = require('../services/facilityService');
const facilityChecklistService = require('../services/facilityChecklistService');

async function assertRead(req, res) {
  const facility = await facilityService.getFacility(req.params.id);
  if (!facility) {
    res.status(404).json({ error: 'Facility not found' });
    return null;
  }
  if (!canAccessAssetco(req.user, facility.assetco_id)) {
    res.status(403).json({ error: 'Cannot access this facility' });
    return null;
  }
  return facility;
}

async function assertWrite(req, res) {
  const facility = await facilityService.getFacility(req.params.id);
  if (!facility) {
    res.status(404).json({ error: 'Facility not found' });
    return null;
  }
  if (!canManageAssetco(req.user, facility.assetco_id)) {
    res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s checklist' });
    return null;
  }
  return facility;
}

async function applyChecklist(req, res, next) {
  try {
    if (!(await assertWrite(req, res))) return;
    const items = await facilityChecklistService.applyChecklist(req.params.id, req.body.businessModel, req.user);
    res.status(201).json({ items });
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    if (!(await assertWrite(req, res))) return;
    const { label, businessModel } = req.body;
    const item = await facilityChecklistService.addItem(req.params.id, { label, businessModel }, req.user);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

async function listChecklist(req, res, next) {
  try {
    if (!(await assertRead(req, res))) return;
    const items = await facilityChecklistService.listChecklist(req.params.id);
    res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const facility = await facilityChecklistService.getItemFacility(req.params.itemId);
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s checklist' });
    }
    const { status, notes } = req.body;
    const item = await facilityChecklistService.updateItem(req.params.itemId, { status, notes }, req.user);
    return res.status(200).json({ item });
  } catch (err) {
    return next(err);
  }
}

module.exports = { applyChecklist, addItem, listChecklist, updateItem };
