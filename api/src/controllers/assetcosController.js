const { canAccessAssetco } = require('../middleware/requireRole');
const assetcoService = require('../services/assetcoService');
const { SECTORS, INTEGRATION_TYPES } = require('../utils/assetcoEnums');

async function list(req, res, next) {
  try {
    const assetcos = await assetcoService.listAssetcos(req.user);
    res.status(200).json({ assetcos });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    if (!canAccessAssetco(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Cannot access this AssetCo' });
    }
    const assetco = await assetcoService.getAssetco(req.params.id);
    if (!assetco) return res.status(404).json({ error: 'AssetCo not found' });

    const stageLog = await assetcoService.getStageLog(req.params.id);
    return res.status(200).json({ assetco, stageLog });
  } catch (err) {
    return next(err);
  }
}

function validateProfileFields(body) {
  const errors = [];
  if (body.sector && !SECTORS.includes(body.sector)) {
    errors.push(`sector must be one of: ${SECTORS.join(', ')}`);
  }
  if (body.integrationType && !INTEGRATION_TYPES.includes(body.integrationType)) {
    errors.push(`integrationType must be one of: ${INTEGRATION_TYPES.join(', ')}`);
  }
  return errors;
}

const PROFILE_FIELD_MAP = {
  name: 'name',
  legalEntityName: 'legal_entity_name',
  registrationNumber: 'registration_number',
  website: 'website',
  assetTypes: 'asset_types',
  customerTypes: 'customer_types',
  sector: 'sector',
  businessDescription: 'business_description',
  hqState: 'hq_state',
  operatingStates: 'operating_states',
  primaryContactName: 'primary_contact_name',
  primaryContactEmail: 'primary_contact_email',
  primaryContactPhone: 'primary_contact_phone',
  logoUrl: 'logo_url',
  integrationType: 'integration_type',
  internalNotes: 'internal_notes',
};

function mapProfileFields(body) {
  const fields = {};
  for (const [key, column] of Object.entries(PROFILE_FIELD_MAP)) {
    if (body[key] !== undefined) fields[column] = body[key];
  }
  return fields;
}

async function create(req, res, next) {
  try {
    if (!['management', 'it_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can create an AssetCo' });
    }
    if (!req.body.id || !req.body.name) {
      return res.status(400).json({ error: 'id and name are required' });
    }
    const errors = validateProfileFields(req.body);
    if (errors.length) return res.status(400).json({ error: 'Invalid payload', details: errors });

    const fields = { id: req.body.id, ...mapProfileFields(req.body) };
    const assetco = await assetcoService.createAssetco(fields, req.user);
    return res.status(201).json({ assetco });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!['management', 'it_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can edit an AssetCo profile' });
    }
    const errors = validateProfileFields(req.body);
    if (errors.length) return res.status(400).json({ error: 'Invalid payload', details: errors });

    const fields = mapProfileFields(req.body);
    const assetco = await assetcoService.updateAssetcoProfile(req.params.id, fields, req.user);
    return res.status(200).json({ assetco });
  } catch (err) {
    return next(err);
  }
}

async function changeStage(req, res, next) {
  try {
    const { stage, notes } = req.body;
    const assetco = await assetcoService.advanceStage(req.params.id, stage, notes, req.user);
    res.status(200).json({ assetco });
  } catch (err) {
    next(err);
  }
}

async function regenerateSecret(req, res, next) {
  try {
    if (!['management', 'it_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can regenerate a signing secret' });
    }
    const hmacSecret = await assetcoService.regenerateHmacSecret(req.params.id, req.user);
    return res.status(200).json({ hmacSecret });
  } catch (err) {
    return next(err);
  }
}

async function runReconciliation(req, res, next) {
  try {
    if (!['management', 'it_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can trigger reconciliation' });
    }
    const result = await assetcoService.runManualReconciliation(req.params.id, req.user);
    return res.status(200).json({ result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getOne, create, update, changeStage, regenerateSecret, runReconciliation };
