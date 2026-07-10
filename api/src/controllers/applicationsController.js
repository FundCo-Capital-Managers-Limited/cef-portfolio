const applicationService = require('../services/applicationService');

async function submit(req, res, next) {
  try {
    const application = await applicationService.submitApplication(req.body);
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const applications = await applicationService.listApplications();
    res.status(200).json({ applications });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const application = await applicationService.getApplication(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.status(200).json({ application });
  } catch (err) {
    next(err);
  }
}

async function review(req, res, next) {
  try {
    const { decision, notes, assetcoId } = req.body;
    const application = await applicationService.reviewApplication(req.params.id, {
      decision,
      notes,
      assetcoId,
      reviewer: req.user,
    });
    res.status(200).json({ application });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit, list, getOne, review };
