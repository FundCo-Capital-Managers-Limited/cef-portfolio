const supabase = require('../config/supabase');

// Module D from the Credit Monitoring Framework (Executive Portfolio
// Monitoring Dashboard Blueprint) - deliberately basic, same spirit as the
// IC dashboard: a handful of ratios computed from tables that already exist
// (cef_facilities/cef_facility_schedule) plus the new compliance tables,
// not a bespoke BI layer.
async function getRiskSummary() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [
    { data: facilities, error: facilitiesError },
    { data: scheduleRows, error: scheduleError },
    { data: documents, error: documentsError },
    { data: security, error: securityError },
    { data: covenants, error: covenantsError },
  ] = await Promise.all([
    supabase.from('cef_facilities').select('id, outstanding_balance_ngn, facility_status'),
    supabase.from('cef_facility_schedule').select('facility_id, due_date, status, total_due_ngn, paid_amount_ngn'),
    supabase.from('facility_documents').select('status'),
    supabase.from('facility_security').select('value_ngn, perfection_status'),
    supabase.from('facility_covenants').select('compliance_status, covenant_type'),
  ]);
  if (facilitiesError) throw facilitiesError;
  if (scheduleError) throw scheduleError;
  if (documentsError) throw documentsError;
  if (securityError) throw securityError;
  if (covenantsError) throw covenantsError;

  // Portfolio at Risk buckets: unpaid/short-paid schedule rows past due,
  // grouped by how many days overdue.
  const overdueRows = (scheduleRows || []).filter(
    (r) => r.due_date < todayIso && ['PENDING', 'PARTIALLY_PAID', 'MISSED'].includes(r.status)
  );
  const parBuckets = { par1To30: 0, par31To90: 0, par91Plus: 0 };
  for (const row of overdueRows) {
    const daysOverdue = Math.floor((Date.parse(todayIso) - Date.parse(row.due_date)) / 86400000);
    const outstandingOnRow = Number(row.total_due_ngn || 0) - Number(row.paid_amount_ngn || 0);
    if (daysOverdue <= 30) parBuckets.par1To30 += outstandingOnRow;
    else if (daysOverdue <= 90) parBuckets.par31To90 += outstandingOnRow;
    else parBuckets.par91Plus += outstandingOnRow;
  }

  // Documentation Completeness Index: % of recorded documents that have
  // actually reached a final state (Executed/Approved), not still Draft/
  // Under Review/missing entirely.
  const totalDocuments = (documents || []).length;
  const finalizedDocuments = (documents || []).filter((d) => ['EXECUTED', 'APPROVED'].includes(d.status)).length;
  const documentationCompletenessPercent = totalDocuments ? Math.round((finalizedDocuments / totalDocuments) * 100) : null;

  // Collateral Coverage Deficit Ratio: total recorded security value vs
  // total outstanding book - a ratio below 1 means the book is under-secured.
  const totalOutstandingNgn = (facilities || []).reduce((sum, f) => sum + Number(f.outstanding_balance_ngn || 0), 0);
  const totalSecurityValueNgn = (security || []).reduce((sum, s) => sum + Number(s.value_ngn || 0), 0);
  const collateralCoverageRatio = totalOutstandingNgn > 0 ? totalSecurityValueNgn / totalOutstandingNgn : null;
  const unperfectedSecurityCount = (security || []).filter((s) => !s.value_ngn || !s.perfection_status).length;

  // Covenant Breach Concentration: non-compliant covenants, segmented by type.
  const nonCompliantCovenants = (covenants || []).filter((c) => c.compliance_status === 'NON_COMPLIANT');
  const covenantBreachByType = { FINANCIAL: 0, REPORTING: 0, OPERATIONAL: 0, NEGATIVE: 0 };
  for (const c of nonCompliantCovenants) {
    if (covenantBreachByType[c.covenant_type] !== undefined) covenantBreachByType[c.covenant_type] += 1;
  }

  return {
    facilityCount: (facilities || []).length,
    totalOutstandingNgn,
    parBuckets,
    documentationCompletenessPercent,
    totalDocuments,
    collateralCoverageRatio,
    totalSecurityValueNgn,
    unperfectedSecurityCount,
    covenantBreachCount: nonCompliantCovenants.length,
    covenantBreachByType,
  };
}

module.exports = { getRiskSummary };
