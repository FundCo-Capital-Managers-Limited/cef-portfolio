const { canAccessAssetco } = require('../middleware/requireRole');
const infracreditService = require('../services/infracreditService');
const { DREEF_STAGES, GUARANTEE_TYPES } = require('../utils/assetcoEnums');

const FIELD_MAP = {
  dreefStage: 'dreef_stage',
  infracreditReference: 'infracredit_reference',
  mandateDate: 'mandate_date',
  guaranteeType: 'guarantee_type',
  guaranteeAmountNgn: 'guarantee_amount_ngn',
  guaranteeTenorYears: 'guarantee_tenor_years',
  infracreditContactName: 'infracredit_contact_name',
  infracreditContactEmail: 'infracredit_contact_email',
  dreefNotes: 'dreef_notes',
};

function mapFields(body) {
  const fields = {};
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    if (body[key] !== undefined) fields[column] = body[key];
  }
  return fields;
}

function validate(body) {
  const errors = [];
  if (body.dreefStage && !DREEF_STAGES.includes(body.dreefStage)) {
    errors.push(`dreefStage must be one of: ${DREEF_STAGES.join(', ')}`);
  }
  if (body.guaranteeType && !GUARANTEE_TYPES.includes(body.guaranteeType)) {
    errors.push(`guaranteeType must be one of: ${GUARANTEE_TYPES.join(', ')}`);
  }
  return errors;
}

async function get(req, res, next) {
  try {
    if (!canAccessAssetco(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Cannot access this AssetCo' });
    }
    const relationship = await infracreditService.getRelationship(req.params.id);
    return res.status(200).json({ relationship });
  } catch (err) {
    return next(err);
  }
}

function requireManagement(req, res) {
  if (!['management', 'it_admin', 'finance', 'risk'].includes(req.user.role)) {
    res.status(403).json({ error: 'Only CEF Management, IT Admin, Finance, or Risk can manage InfraCredit/DREEF data' });
    return false;
  }
  return true;
}

async function create(req, res, next) {
  try {
    if (!requireManagement(req, res)) return undefined;
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ error: 'Invalid payload', details: errors });

    const relationship = await infracreditService.createRelationship(req.params.id, mapFields(req.body), req.user);
    return res.status(201).json({ relationship });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!requireManagement(req, res)) return undefined;
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ error: 'Invalid payload', details: errors });

    const relationship = await infracreditService.updateRelationship(req.params.id, mapFields(req.body), req.user);
    return res.status(200).json({ relationship });
  } catch (err) {
    return next(err);
  }
}

module.exports = { get, create, update };
