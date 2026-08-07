const { canAccessAssetco, canManageAssetco } = require('../middleware/requireRole');
const facilityService = require('../services/facilityService');
const facilityMilestoneService = require('../services/facilityMilestoneService');

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
    res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s milestones' });
    return null;
  }
  return facility;
}

async function addMilestone(req, res, next) {
  try {
    if (!(await assertWrite(req, res))) return;
    const { title, description, targetDate } = req.body;
    const milestone = await facilityMilestoneService.addMilestone(req.params.id, { title, description, targetDate }, req.user);
    res.status(201).json({ milestone });
  } catch (err) {
    next(err);
  }
}

async function listMilestones(req, res, next) {
  try {
    if (!(await assertRead(req, res))) return;
    const milestones = await facilityMilestoneService.listMilestones(req.params.id);
    res.status(200).json({ milestones });
  } catch (err) {
    next(err);
  }
}

async function updateMilestone(req, res, next) {
  try {
    const facility = await facilityMilestoneService.getMilestoneFacility(req.params.milestoneId);
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s milestones' });
    }
    const { status, targetDate, completedDate, evidenceUrl, notes } = req.body;
    const milestone = await facilityMilestoneService.updateMilestone(
      req.params.milestoneId,
      { status, targetDate, completedDate, evidenceUrl, notes },
      req.user
    );
    return res.status(200).json({ milestone });
  } catch (err) {
    return next(err);
  }
}

module.exports = { addMilestone, listMilestones, updateMilestone };
