const { canAccessAssetco, canManageAssetco } = require('../middleware/requireRole');
const facilityService = require('../services/facilityService');
const facilityComplianceService = require('../services/facilityComplianceService');

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
    res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s records' });
    return null;
  }
  return facility;
}

// --- Documents ---

async function addDocument(req, res, next) {
  try {
    if (!(await assertWrite(req, res))) return;
    const { title, classification, sharepointUrl } = req.body;
    const document = await facilityComplianceService.addDocument(req.params.id, { title, classification, sharepointUrl }, req.user);
    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    if (!(await assertRead(req, res))) return;
    const documents = await facilityComplianceService.listDocuments(req.params.id);
    res.status(200).json({ documents });
  } catch (err) {
    next(err);
  }
}

async function updateDocument(req, res, next) {
  try {
    const facility = await facilityComplianceService.getDocumentFacility(req.params.documentId);
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s records' });
    }
    const { status, sharepointUrl } = req.body;
    const document = await facilityComplianceService.updateDocument(req.params.documentId, { status, sharepointUrl }, req.user);
    return res.status(200).json({ document });
  } catch (err) {
    return next(err);
  }
}

async function confirmDocument(req, res, next) {
  try {
    const facility = await facilityComplianceService.getDocumentFacility(req.params.documentId);
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s records' });
    }
    const document = await facilityComplianceService.confirmDocumentUpload(req.params.documentId, req.user);
    return res.status(200).json({ document });
  } catch (err) {
    return next(err);
  }
}

// --- Security ---

async function addSecurity(req, res, next) {
  try {
    if (!(await assertWrite(req, res))) return;
    const { securityType, valueNgn, perfectionStatus, insuranceStatus, notes } = req.body;
    const security = await facilityComplianceService.addSecurity(req.params.id, { securityType, valueNgn, perfectionStatus, insuranceStatus, notes }, req.user);
    res.status(201).json({ security });
  } catch (err) {
    next(err);
  }
}

async function listSecurity(req, res, next) {
  try {
    if (!(await assertRead(req, res))) return;
    const security = await facilityComplianceService.listSecurity(req.params.id);
    res.status(200).json({ security });
  } catch (err) {
    next(err);
  }
}

async function updateSecurity(req, res, next) {
  try {
    const facility = await facilityComplianceService.getSecurityFacility(req.params.securityId);
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s records' });
    }
    const { valueNgn, perfectionStatus, insuranceStatus, notes } = req.body;
    const security = await facilityComplianceService.updateSecurity(req.params.securityId, { valueNgn, perfectionStatus, insuranceStatus, notes }, req.user);
    return res.status(200).json({ security });
  } catch (err) {
    return next(err);
  }
}

// --- Covenants ---

async function addCovenant(req, res, next) {
  try {
    if (!(await assertWrite(req, res))) return;
    const { covenantDescription, covenantType, frequency, dueDate } = req.body;
    const covenant = await facilityComplianceService.addCovenant(req.params.id, { covenantDescription, covenantType, frequency, dueDate }, req.user);
    res.status(201).json({ covenant });
  } catch (err) {
    next(err);
  }
}

async function listCovenants(req, res, next) {
  try {
    if (!(await assertRead(req, res))) return;
    const covenants = await facilityComplianceService.listCovenants(req.params.id);
    res.status(200).json({ covenants });
  } catch (err) {
    next(err);
  }
}

async function updateCovenant(req, res, next) {
  try {
    const facility = await facilityComplianceService.getCovenantFacility(req.params.covenantId);
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, Risk, or the AssetCo\'s own admin can manage this facility\'s records' });
    }
    const { complianceStatus, lastTestedDate, notes } = req.body;
    const covenant = await facilityComplianceService.updateCovenant(req.params.covenantId, { complianceStatus, lastTestedDate, notes }, req.user);
    return res.status(200).json({ covenant });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  addDocument, listDocuments, updateDocument, confirmDocument,
  addSecurity, listSecurity, updateSecurity,
  addCovenant, listCovenants, updateCovenant,
};
