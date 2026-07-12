const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { sendFacilityAlert } = require('./alertEngine');
const { MONTHS_PER_PERIOD } = require('../utils/facilityEnums');
const logger = require('../utils/logger');

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function periodLabel(dateStr) {
  return dateStr.slice(0, 7);
}

/**
 * Generates the expected repayment schedule for a fixed-frequency facility.
 * Equal principal instalments scaled to the period length (principal/tenor
 * Months * monthsPerPeriod), flat interest per period (principal * annual
 * rate / periods-per-year) — a simplification appropriate for MVP tracking,
 * not a full amortization schedule.
 */
function buildScheduleRows(facility) {
  const monthsPerPeriod = MONTHS_PER_PERIOD[facility.repayment_frequency];
  if (!monthsPerPeriod) return [];

  const periods = Math.max(Math.round(facility.tenor_months / monthsPerPeriod), 1);
  const principalPerPeriod = (facility.principal_amount_ngn / facility.tenor_months) * monthsPerPeriod;
  const periodsPerYear = 12 / monthsPerPeriod;
  const interestPerPeriod = facility.interest_rate_percent
    ? (facility.principal_amount_ngn * (facility.interest_rate_percent / 100)) / periodsPerYear
    : 0;

  const startDate =
    facility.repayment_start_date ||
    addMonths(facility.disbursement_date || new Date().toISOString().slice(0, 10), facility.grace_period_months || 0);

  return Array.from({ length: periods }, (_, i) => {
    const dueDate = addMonths(startDate, i * monthsPerPeriod);
    return {
      facility_id: facility.id,
      due_date: dueDate,
      period: periodLabel(dueDate),
      principal_due_ngn: Math.round(principalPerPeriod),
      interest_due_ngn: Math.round(interestPerPeriod),
      status: 'PENDING',
    };
  });
}

async function createFacility(fields, user) {
  // Set defaults explicitly rather than relying on the DB column defaults —
  // keeps facility_status/currency/total_repaid_ngn reliably present the
  // instant the row exists, rather than only after a round-trip re-read.
  const { data: facility, error } = await supabase
    .from('cef_facilities')
    .insert({
      currency: 'NGN',
      repayment_frequency: 'MONTHLY',
      grace_period_months: 0,
      total_repaid_ngn: 0,
      facility_status: 'ACTIVE',
      ...fields,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;

  let scheduleCount = 0;
  const scheduleRows = buildScheduleRows(facility);
  if (scheduleRows.length) {
    const { error: scheduleError } = await supabase.from('cef_facility_schedule').insert(scheduleRows);
    if (scheduleError) throw scheduleError;
    scheduleCount = scheduleRows.length;
  }

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: facility.assetco_id,
    action: 'FACILITY_CREATED',
    entityType: 'cef_facility',
    entityId: facility.id,
    details: { principalAmountNgn: facility.principal_amount_ngn, scheduleCount },
  });

  return { ...facility, scheduleCount };
}

async function getFacilitiesForAssetco(assetCoId) {
  const { data, error } = await supabase.from('cef_facilities').select('*').eq('assetco_id', assetCoId);
  if (error) throw error;
  return data || [];
}

async function getFacility(id) {
  const { data, error } = await supabase.from('cef_facilities').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function getFacilityDetail(id) {
  const facility = await getFacility(id);
  if (!facility) return null;

  const [{ data: schedule, error: scheduleError }, { data: repayments, error: repaymentsError }] = await Promise.all([
    supabase.from('cef_facility_schedule').select('*').eq('facility_id', id).order('due_date'),
    supabase.from('cef_facility_repayments').select('*').eq('facility_id', id).order('payment_date', { ascending: false }).limit(24),
  ]);
  if (scheduleError) throw scheduleError;
  if (repaymentsError) throw repaymentsError;

  const outstanding = facility.outstanding_balance_ngn ?? facility.principal_amount_ngn - facility.total_repaid_ngn;
  const nextDue = (schedule || []).find((s) => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID');
  const totalDueToDate = (schedule || [])
    .filter((s) => new Date(s.due_date) <= new Date())
    .reduce((sum, s) => sum + Number(s.total_due_ngn ?? Number(s.principal_due_ngn) + Number(s.interest_due_ngn)), 0);

  return {
    facility,
    schedule: schedule || [],
    repayments: repayments || [],
    summary: {
      totalDueToDate,
      totalPaid: facility.total_repaid_ngn,
      totalOutstanding: outstanding,
      nextDueDate: nextDue?.due_date || null,
      nextDueAmount: nextDue ? Number(nextDue.total_due_ngn ?? Number(nextDue.principal_due_ngn) + Number(nextDue.interest_due_ngn)) : null,
    },
  };
}

async function updateFacilityStatus(id, status, notes, user) {
  const { error } = await supabase.from('cef_facilities').update({ facility_status: status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'FACILITY_STATUS_CHANGED',
    entityType: 'cef_facility',
    entityId: id,
    details: { status, notes },
  });

  return getFacility(id);
}

/**
 * Records a repayment from an AssetCo back to CEF. Explicitly recomputes
 * total_repaid_ngn here rather than relying solely on the DB trigger
 * (trg_update_facility_total_repaid) — that trigger is a defense-in-depth
 * safety net for direct SQL inserts, not the primary mechanism, so this
 * behaves identically whether or not the trigger fires.
 */
async function recordRepayment(facilityId, fields, user) {
  const facility = await getFacility(facilityId);
  if (!facility) {
    const err = new Error('Facility not found');
    err.status = 404;
    throw err;
  }
  if (['FULLY_REPAID', 'WRITTEN_OFF'].includes(facility.facility_status)) {
    const err = new Error(`Cannot record a repayment on a facility with status ${facility.facility_status}`);
    err.status = 400;
    throw err;
  }

  const matchingSchedule = fields.period_covered
    ? (
        await supabase
          .from('cef_facility_schedule')
          .select('*')
          .eq('facility_id', facilityId)
          .eq('period', fields.period_covered)
          .maybeSingle()
      ).data
    : null;

  let wasOnTime = null;
  let daysLate = null;
  if (matchingSchedule) {
    const dueDate = new Date(matchingSchedule.due_date);
    const paidDate = new Date(fields.payment_date);
    daysLate = Math.max(Math.round((paidDate - dueDate) / 86400000), 0);
    wasOnTime = paidDate <= dueDate;
  }

  const { data: repayment, error } = await supabase
    .from('cef_facility_repayments')
    .insert({
      facility_id: facilityId,
      assetco_id: facility.assetco_id,
      was_on_time: wasOnTime,
      days_late: daysLate,
      recorded_by: user.id,
      ...fields,
    })
    .select()
    .single();
  if (error) throw error;

  const { data: allRepayments, error: sumError } = await supabase
    .from('cef_facility_repayments')
    .select('principal_paid_ngn')
    .eq('facility_id', facilityId);
  if (sumError) throw sumError;
  const totalRepaidNgn = (allRepayments || []).reduce((sum, r) => sum + Number(r.principal_paid_ngn || 0), 0);

  if (matchingSchedule) {
    const paidForPeriod = (allRepayments || []).length ? matchingSchedule.paid_amount_ngn || 0 : 0;
    const newPaidAmount = Number(paidForPeriod) + Number(fields.principal_paid_ngn || 0) + Number(fields.interest_paid_ngn || 0);
    const totalDue = Number(matchingSchedule.total_due_ngn ?? Number(matchingSchedule.principal_due_ngn) + Number(matchingSchedule.interest_due_ngn));
    const scheduleStatus = newPaidAmount >= totalDue ? 'PAID' : 'PARTIALLY_PAID';
    const { error: scheduleUpdateError } = await supabase
      .from('cef_facility_schedule')
      .update({ status: scheduleStatus, paid_amount_ngn: newPaidAmount, paid_date: fields.payment_date })
      .eq('id', matchingSchedule.id);
    if (scheduleUpdateError) throw scheduleUpdateError;
  }

  const outstandingBalanceNgn = facility.principal_amount_ngn - totalRepaidNgn;
  let newFacilityStatus = facility.facility_status;
  if (outstandingBalanceNgn <= 0) {
    newFacilityStatus = 'FULLY_REPAID';
  } else if (facility.facility_status === 'IN_ARREARS') {
    const { data: remainingMissed } = await supabase
      .from('cef_facility_schedule')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('status', 'MISSED');
    if (!remainingMissed || remainingMissed.length === 0) newFacilityStatus = 'ACTIVE';
  }

  const { error: facilityUpdateError } = await supabase
    .from('cef_facilities')
    .update({ total_repaid_ngn: totalRepaidNgn, facility_status: newFacilityStatus, updated_at: new Date().toISOString() })
    .eq('id', facilityId);
  if (facilityUpdateError) throw facilityUpdateError;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: facility.assetco_id,
    action: 'FACILITY_REPAYMENT_RECORDED',
    entityType: 'cef_facility_repayment',
    entityId: repayment.id,
    details: { facilityId, ...fields },
  });

  return getFacility(facilityId);
}

async function getRepaymentHistory(facilityId) {
  const { data, error } = await supabase
    .from('cef_facility_repayments')
    .select('*')
    .eq('facility_id', facilityId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getPortfolioLoanBook() {
  const [{ data: facilities, error }, { data: assetcos, error: assetcosError }, { data: series, error: seriesError }] =
    await Promise.all([
      supabase.from('cef_facilities').select('*'),
      supabase.from('assetcos').select('id, name'),
      supabase.from('cef_series').select('id, code, display_name'),
    ]);
  if (error) throw error;
  if (assetcosError) throw assetcosError;
  if (seriesError) throw seriesError;

  const all = facilities || [];
  const totalFacilitiesNgn = all.reduce((sum, f) => sum + Number(f.principal_amount_ngn || 0), 0);
  const totalRepaidNgn = all.reduce((sum, f) => sum + Number(f.total_repaid_ngn || 0), 0);
  const assetcoById = new Map((assetcos || []).map((a) => [a.id, a]));

  const byAssetCo = (assetcos || [])
    .map((a) => {
      const coFacilities = all.filter((f) => f.assetco_id === a.id);
      if (coFacilities.length === 0) return null;
      const totalFacilityNgn = coFacilities.reduce((sum, f) => sum + Number(f.principal_amount_ngn || 0), 0);
      const totalRepaid = coFacilities.reduce((sum, f) => sum + Number(f.total_repaid_ngn || 0), 0);
      const statusPriority = ['IN_DEFAULT', 'IN_ARREARS', 'RESTRUCTURED', 'ACTIVE', 'WRITTEN_OFF', 'FULLY_REPAID'];
      const worstStatus = coFacilities
        .map((f) => f.facility_status)
        .sort((x, y) => statusPriority.indexOf(x) - statusPriority.indexOf(y))[0];
      return {
        assetCoId: a.id,
        assetCoName: a.name,
        totalFacilityNgn,
        totalRepaidNgn: totalRepaid,
        outstandingNgn: totalFacilityNgn - totalRepaid,
        facilityStatus: worstStatus,
      };
    })
    .filter(Boolean);

  const bySeries = (series || [])
    .map((s) => {
      const seriesFacilities = all.filter((f) => f.series_id === s.id);
      if (seriesFacilities.length === 0) return null;
      const totalDeployedNgn = seriesFacilities.reduce((sum, f) => sum + Number(f.principal_amount_ngn || 0), 0);
      const totalRepaid = seriesFacilities.reduce((sum, f) => sum + Number(f.total_repaid_ngn || 0), 0);
      return {
        seriesCode: s.code,
        seriesName: s.display_name,
        totalDeployedNgn,
        totalRepaidNgn: totalRepaid,
        outstandingNgn: totalDeployedNgn - totalRepaid,
      };
    })
    .filter(Boolean);

  return {
    totalFacilitiesNgn,
    totalRepaidNgn,
    totalOutstandingNgn: totalFacilitiesNgn - totalRepaidNgn,
    repaymentRatePercent: totalFacilitiesNgn > 0 ? (totalRepaidNgn / totalFacilitiesNgn) * 100 : 0,
    totalFacilitiesCount: all.length,
    activeFacilitiesCount: all.filter((f) => f.facility_status === 'ACTIVE').length,
    inArrearsCount: all.filter((f) => f.facility_status === 'IN_ARREARS').length,
    inDefaultCount: all.filter((f) => f.facility_status === 'IN_DEFAULT').length,
    fullyRepaidCount: all.filter((f) => f.facility_status === 'FULLY_REPAID').length,
    byAssetCo,
    bySeries,
  };
}

/**
 * Nightly check: flags schedule rows that passed their due_date still
 * PENDING (ALT-14), rows now 7+ days overdue (ALT-15), and facilities
 * approaching maturity with a balance still outstanding (ALT-16). Each
 * alert is only ever sent once per schedule row / facility (checked via the
 * alerts table itself) to avoid re-alerting every night on the same miss.
 */
async function checkFacilityArrears() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const results = { missed: 0, overdue7Days: 0, approachingMaturity: 0 };

  const { data: overduePending, error: overdueError } = await supabase
    .from('cef_facility_schedule')
    .select('*')
    .lte('due_date', todayStr)
    .eq('status', 'PENDING');
  if (overdueError) throw overdueError;

  for (const row of overduePending || []) {
    // eslint-disable-next-line no-await-in-loop
    await supabase.from('cef_facility_schedule').update({ status: 'MISSED' }).eq('id', row.id);
    // eslint-disable-next-line no-await-in-loop
    const facility = await getFacility(row.facility_id);
    if (facility && facility.facility_status === 'ACTIVE') {
      // eslint-disable-next-line no-await-in-loop
      await supabase.from('cef_facilities').update({ facility_status: 'IN_ARREARS' }).eq('id', row.facility_id);
    }
    // eslint-disable-next-line no-await-in-loop
    await sendFacilityAlert({
      alertType: 'CEF_FACILITY_REPAYMENT_MISSED',
      assetCoId: facility?.assetco_id,
      facilityId: row.facility_id,
      scheduleId: row.id,
      message: `CEF facility ${facility?.facility_reference || row.facility_id} missed a scheduled repayment due ${row.due_date}.`,
    });
    results.missed += 1;
  }

  const { data: missedRows, error: missedError } = await supabase
    .from('cef_facility_schedule')
    .select('*')
    .eq('status', 'MISSED');
  if (missedError) throw missedError;

  for (const row of missedRows || []) {
    const daysOverdue = Math.floor((new Date(todayStr) - new Date(row.due_date)) / 86400000);
    if (daysOverdue < 7) continue;
    // eslint-disable-next-line no-await-in-loop
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'CEF_FACILITY_7_DAYS_OVERDUE')
      .eq('schedule_id', row.id)
      .maybeSingle();
    if (existingAlert) continue;

    // eslint-disable-next-line no-await-in-loop
    const facility = await getFacility(row.facility_id);
    // eslint-disable-next-line no-await-in-loop
    await sendFacilityAlert({
      alertType: 'CEF_FACILITY_7_DAYS_OVERDUE',
      assetCoId: facility?.assetco_id,
      facilityId: row.facility_id,
      scheduleId: row.id,
      message: `CEF facility ${facility?.facility_reference || row.facility_id} is ${daysOverdue} days overdue on its repayment due ${row.due_date}.`,
    });
    results.overdue7Days += 1;
  }

  const thirtyDaysOut = addMonths(todayStr, 1);
  const { data: maturingFacilities, error: maturingError } = await supabase
    .from('cef_facilities')
    .select('*')
    .lte('maturity_date', thirtyDaysOut)
    .gte('maturity_date', todayStr);
  if (maturingError) throw maturingError;

  for (const facility of (maturingFacilities || []).filter((f) => f.outstanding_balance_ngn > 0 || f.principal_amount_ngn - f.total_repaid_ngn > 0)) {
    // eslint-disable-next-line no-await-in-loop
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'CEF_FACILITY_APPROACHING_MATURITY')
      .eq('facility_id', facility.id)
      .maybeSingle();
    if (existingAlert) continue;

    // eslint-disable-next-line no-await-in-loop
    await sendFacilityAlert({
      alertType: 'CEF_FACILITY_APPROACHING_MATURITY',
      assetCoId: facility.assetco_id,
      facilityId: facility.id,
      message: `CEF facility ${facility.facility_reference || facility.id} approaches maturity (${facility.maturity_date}) with an outstanding balance.`,
    });
    results.approachingMaturity += 1;
  }

  logger.info('Facility arrears check complete', results);
  return results;
}

module.exports = {
  createFacility,
  getFacilitiesForAssetco,
  getFacility,
  getFacilityDetail,
  updateFacilityStatus,
  recordRepayment,
  getRepaymentHistory,
  getPortfolioLoanBook,
  checkFacilityArrears,
  buildScheduleRows,
};
