const { canAccessAssetco, canManageAssetco, CEF_WIDE_ROLES } = require('../middleware/requireRole');
const facilityService = require('../services/facilityService');
const repaymentNotificationService = require('../services/facilityRepaymentNotificationService');
const facilityRiskDashboardService = require('../services/facilityRiskDashboardService');
const supabase = require('../config/supabase');
const { recordAudit } = require('../services/auditLog');
const { FACILITY_TYPES, REPAYMENT_FREQUENCIES, FACILITY_STATUSES, PAYMENT_TYPES } = require('../utils/facilityEnums');

// AssetCos repay CEF by bank transfer and notify separately, they never
// record a repayment on the platform directly - canManageAssetco is too
// broad here (it includes the AssetCo's own admin, which is right for
// managing the facility's terms but wrong for recording CEF's own loan-book
// cash receipts). See facilityRepaymentNotificationService.js for the
// notify-then-confirm workflow AssetCo reps actually use instead.
const CEF_STAFF_ROLES = ['management', 'it_admin', 'finance', 'risk'];

// The discretionary reclassification call (Oluseyi's ask, 2026-08-05
// walkthrough) is narrower than general facility management — it's a credit
// judgment call, not a data-entry task, so it's restricted to the roles who
// actually make that call rather than canManageAssetco's broader set.
const CLASSIFICATION_OVERRIDE_ROLES = ['management', 'risk', 'executive'];

const FACILITY_FIELD_MAP = {
  assetCoId: 'assetco_id',
  seriesId: 'series_id',
  facilityReference: 'facility_reference',
  facilityType: 'facility_type',
  principalAmountNgn: 'principal_amount_ngn',
  interestRatePercent: 'interest_rate_percent',
  tenorMonths: 'tenor_months',
  disbursementDate: 'disbursement_date',
  maturityDate: 'maturity_date',
  repaymentFrequency: 'repayment_frequency',
  repaymentStartDate: 'repayment_start_date',
  gracePeriodMonths: 'grace_period_months',
  scheduledRepaymentAmountNgn: 'scheduled_repayment_amount_ngn',
  collateralDescription: 'collateral_description',
  covenantNotes: 'covenant_notes',
  internalNotes: 'internal_notes',
};

function mapFields(body, map) {
  const fields = {};
  for (const [key, column] of Object.entries(map)) {
    if (body[key] !== undefined) fields[column] = body[key];
  }
  return fields;
}

async function create(req, res, next) {
  try {
    if (!canManageAssetco(req.user, req.body.assetCoId)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, or the AssetCo\'s own admin can create a facility' });
    }
    const { assetCoId, principalAmountNgn, tenorMonths, repaymentFrequency } = req.body;
    if (!assetCoId || typeof principalAmountNgn !== 'number' || !tenorMonths) {
      return res.status(400).json({ error: 'assetCoId, principalAmountNgn, and tenorMonths are required' });
    }
    if (req.body.facilityType && !FACILITY_TYPES.includes(req.body.facilityType)) {
      return res.status(400).json({ error: `facilityType must be one of: ${FACILITY_TYPES.join(', ')}` });
    }
    if (repaymentFrequency && !REPAYMENT_FREQUENCIES.includes(repaymentFrequency)) {
      return res.status(400).json({ error: `repaymentFrequency must be one of: ${REPAYMENT_FREQUENCIES.join(', ')}` });
    }

    const fields = mapFields(req.body, FACILITY_FIELD_MAP);
    const facility = await facilityService.createFacility(fields, req.user);
    return res.status(201).json({ facility });
  } catch (err) {
    return next(err);
  }
}

async function listForAssetco(req, res, next) {
  try {
    if (!canAccessAssetco(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Cannot access this AssetCo' });
    }
    const facilities = await facilityService.getFacilitiesForAssetco(req.params.id);
    return res.status(200).json({ facilities });
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await facilityService.getFacilityDetail(req.params.id);
    if (!result) return res.status(404).json({ error: 'Facility not found' });
    if (!canAccessAssetco(req.user, result.facility.assetco_id)) {
      return res.status(403).json({ error: 'Cannot access this facility' });
    }
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const facility = await facilityService.getFacility(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, or the AssetCo\'s own admin can update this facility' });
    }
    const fields = mapFields(req.body, FACILITY_FIELD_MAP);
    const { error } = await supabase.from('cef_facilities').update(fields).eq('id', req.params.id);
    if (error) throw error;

    await recordAudit({
      actorType: 'user',
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      actorAssetcoId: facility.assetco_id,
      action: 'FACILITY_UPDATED',
      entityType: 'cef_facility',
      entityId: req.params.id,
      details: { fields: Object.keys(fields) },
    });

    return res.status(200).json({ facility: await facilityService.getFacility(req.params.id) });
  } catch (err) {
    return next(err);
  }
}

async function changeStatus(req, res, next) {
  try {
    const facility = await facilityService.getFacility(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (!canManageAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Only CEF Management, IT Admin, or the AssetCo\'s own admin can update this facility' });
    }
    if (!FACILITY_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `status must be one of: ${FACILITY_STATUSES.join(', ')}` });
    }
    const updated = await facilityService.updateFacilityStatus(req.params.id, req.body.status, req.body.notes, req.user);
    return res.status(200).json({ facility: updated });
  } catch (err) {
    return next(err);
  }
}

async function setClassificationOverride(req, res, next) {
  try {
    if (!CLASSIFICATION_OVERRIDE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Management, Risk, or Executive can set a discretionary classification override' });
    }
    const { status, reason } = req.body;
    if (!FACILITY_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${FACILITY_STATUSES.join(', ')}` });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'reason is required when overriding a facility\'s classification' });
    }
    const facility = await facilityService.setClassificationOverride(req.params.id, status, reason, req.user);
    return res.status(200).json({ facility });
  } catch (err) {
    return next(err);
  }
}

async function clearClassificationOverride(req, res, next) {
  try {
    if (!CLASSIFICATION_OVERRIDE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Management, Risk, or Executive can clear a discretionary classification override' });
    }
    const facility = await facilityService.clearClassificationOverride(req.params.id, req.user);
    return res.status(200).json({ facility });
  } catch (err) {
    return next(err);
  }
}

async function recordRepayment(req, res, next) {
  try {
    const facility = await facilityService.getFacility(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (!CEF_STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Finance, Risk, IT Admin, or Management can record repayments' });
    }

    const { paymentDate, principalPaidNgn, interestPaidNgn } = req.body;
    if (!paymentDate || (principalPaidNgn === undefined && interestPaidNgn === undefined)) {
      return res.status(400).json({ error: 'paymentDate and at least one of principalPaidNgn/interestPaidNgn are required' });
    }
    if (req.body.paymentType && !PAYMENT_TYPES.includes(req.body.paymentType)) {
      return res.status(400).json({ error: `paymentType must be one of: ${PAYMENT_TYPES.join(', ')}` });
    }

    const fields = {
      payment_date: paymentDate,
      principal_paid_ngn: principalPaidNgn || 0,
      interest_paid_ngn: interestPaidNgn || 0,
      fees_paid_ngn: req.body.feesPaidNgn || 0,
      payment_reference: req.body.paymentReference || null,
      payment_type: req.body.paymentType || 'SCHEDULED',
      period_covered: req.body.periodCovered || null,
      notes: req.body.notes || null,
    };

    const updated = await facilityService.recordRepayment(req.params.id, fields, req.user);
    return res.status(201).json({ facility: updated });
  } catch (err) {
    return next(err);
  }
}

async function repaymentHistory(req, res, next) {
  try {
    const facility = await facilityService.getFacility(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (!canAccessAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Cannot access this facility' });
    }
    const repayments = await facilityService.getRepaymentHistory(req.params.id);
    return res.status(200).json({ repayments });
  } catch (err) {
    return next(err);
  }
}

async function submitRepaymentNotification(req, res, next) {
  try {
    const facility = await facilityService.getFacility(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (!canAccessAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Cannot access this facility' });
    }
    const { amountNgn, paymentDate, paymentReference, periodCovered, notes } = req.body;
    const notification = await repaymentNotificationService.submitNotification(
      req.params.id,
      { amountNgn, paymentDate, paymentReference, periodCovered, notes },
      req.user
    );
    return res.status(201).json({ notification });
  } catch (err) {
    return next(err);
  }
}

async function listRepaymentNotifications(req, res, next) {
  try {
    const facility = await facilityService.getFacility(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (!canAccessAssetco(req.user, facility.assetco_id)) {
      return res.status(403).json({ error: 'Cannot access this facility' });
    }
    const notifications = await repaymentNotificationService.listForFacility(req.params.id);
    return res.status(200).json({ notifications });
  } catch (err) {
    return next(err);
  }
}

async function listPendingRepaymentNotifications(req, res, next) {
  try {
    if (!CEF_STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Finance, Risk, IT Admin, or Management can view the pending repayment queue' });
    }
    const notifications = await repaymentNotificationService.listPending();
    return res.status(200).json({ notifications });
  } catch (err) {
    return next(err);
  }
}

async function confirmRepaymentNotification(req, res, next) {
  try {
    const result = await repaymentNotificationService.confirmNotification(req.params.notificationId, req.user);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function rejectRepaymentNotification(req, res, next) {
  try {
    const notification = await repaymentNotificationService.rejectNotification(req.params.notificationId, req.body.reason, req.user);
    return res.status(200).json({ notification });
  } catch (err) {
    return next(err);
  }
}

async function loanBook(req, res, next) {
  try {
    if (!CEF_WIDE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF-wide roles can view the portfolio loan book' });
    }
    const result = await facilityService.getPortfolioLoanBook();
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function riskSummary(req, res, next) {
  try {
    if (!CEF_WIDE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF-wide roles can view the portfolio risk summary' });
    }
    const summary = await facilityRiskDashboardService.getRiskSummary();
    return res.status(200).json({ summary });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create, listForAssetco, getOne, update, changeStatus, recordRepayment, repaymentHistory, loanBook, riskSummary,
  setClassificationOverride, clearClassificationOverride,
  submitRepaymentNotification, listRepaymentNotifications, listPendingRepaymentNotifications,
  confirmRepaymentNotification, rejectRepaymentNotification,
};
