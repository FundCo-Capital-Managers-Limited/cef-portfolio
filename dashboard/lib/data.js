import { createClient } from './supabaseServer';

export async function getCurrentUserProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role, assetco_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return profile || { id: null, email: user.email, role: null, assetco_id: null };
}

/**
 * Monthly collections trend for charts — last 12 months of payment.received
 * amounts, grouped by calendar month. Scoped to a single AssetCo when
 * assetCoId is provided, otherwise portfolio-wide.
 */
export async function getMonthlyCollectionsTrend(assetCoId) {
  const supabase = createClient();

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  let query = supabase
    .from('payments')
    .select('amount, occurred_at')
    .eq('status', 'received')
    .gte('occurred_at', twelveMonthsAgo.toISOString());
  if (assetCoId) query = query.eq('assetco_id', assetCoId);

  const { data: payments } = await query;

  const buckets = new Map();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    buckets.set(d.toISOString().slice(0, 7), 0);
  }
  for (const p of payments || []) {
    const key = p.occurred_at.slice(0, 7);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + Number(p.amount || 0));
  }

  return [...buckets.entries()].map(([month, amount]) => ({ month, amount }));
}

/**
 * Tier 1 — Portfolio Dashboard: cashflow totals, default tracker, fault
 * summary, and sync freshness, aggregated across all AssetCos.
 */
export async function getPortfolioSummary() {
  const supabase = createClient();

  const [{ data: assetcos }, { data: cashflow }, { data: faults }, { data: alerts }, { data: syncState }, { data: customers }] =
    await Promise.all([
      supabase.from('assetcos').select('id, name, is_active'),
      supabase.from('cashflow_state').select('*'),
      supabase.from('faults').select('id, assetco_id, status'),
      supabase.from('alerts').select('*').order('sent_at', { ascending: false }).limit(10),
      supabase.from('sync_state').select('*'),
      supabase.from('customers').select('assetco_id, status'),
    ]);

  const totalCollected = (cashflow || []).reduce((sum, c) => sum + Number(c.total_collected || 0), 0);
  const totalOutstanding = (cashflow || []).reduce((sum, c) => sum + Number(c.outstanding_balance || 0), 0);
  const defaultCount = (cashflow || []).filter((c) => c.is_defaulted).length;
  const openFaultCount = (faults || []).filter((f) => f.status === 'open').length;

  const PIPELINE_STATUSES = ['PIPELINE', 'ASSET_ORDERED', 'INSTALLATION_SCHEDULED'];

  const assetCoCards = (assetcos || []).map((co) => {
    const coCashflow = (cashflow || []).filter((c) => c.assetco_id === co.id);
    const coFaults = (faults || []).filter((f) => f.assetco_id === co.id && f.status === 'open');
    const sync = (syncState || []).find((s) => s.assetco_id === co.id);
    const coCustomers = (customers || []).filter((c) => c.assetco_id === co.id);
    return {
      id: co.id,
      name: co.name,
      isActive: co.is_active,
      activeAssets: coCashflow.length,
      monthlyCollection: coCashflow.reduce((sum, c) => sum + Number(c.total_collected || 0), 0),
      defaultCount: coCashflow.filter((c) => c.is_defaulted).length,
      openFaultCount: coFaults.length,
      lastSyncedAt: sync?.last_heartbeat_at || null,
      pipelineCount: coCustomers.filter((c) => PIPELINE_STATUSES.includes(c.status)).length,
    };
  });

  return {
    totalCollected,
    totalOutstanding,
    collectionRate: totalCollected + totalOutstanding > 0
      ? totalCollected / (totalCollected + totalOutstanding)
      : null,
    defaultCount,
    openFaultCount,
    assetCoCards,
    recentAlerts: alerts || [],
  };
}

/**
 * Tier 2 — AssetCo Dashboard: per-AssetCo cashflow, customer status
 * breakdown, faults, and recent event activity.
 */
export async function getAssetCoDetail(assetCoId) {
  const supabase = createClient();

  const [{ data: assetco }, { data: cashflow }, { data: faults }, { data: events }, { data: customers }] = await Promise.all([
    supabase.from('assetcos').select('*').eq('id', assetCoId).maybeSingle(),
    supabase.from('cashflow_state').select('*').eq('assetco_id', assetCoId),
    supabase.from('faults').select('*').eq('assetco_id', assetCoId),
    supabase
      .from('events')
      .select('id, event_type, asset_id, received_at')
      .eq('assetco_id', assetCoId)
      .order('received_at', { ascending: false })
      .limit(20),
    supabase.from('customers').select('*').eq('assetco_id', assetCoId),
  ]);

  const customerBreakdown = {
    current: (cashflow || []).filter((c) => !c.is_defaulted && c.missed_count === 0).length,
    arrears1: (cashflow || []).filter((c) => !c.is_defaulted && c.missed_count === 1).length,
    arrears2Plus: (cashflow || []).filter((c) => !c.is_defaulted && c.missed_count >= 2).length,
    defaulted: (cashflow || []).filter((c) => c.is_defaulted).length,
  };

  const PIPELINE_STATUSES = ['PIPELINE', 'ASSET_ORDERED', 'INSTALLATION_SCHEDULED'];
  const pipelineCustomers = (customers || [])
    .filter((c) => PIPELINE_STATUSES.includes(c.status))
    .sort((a, b) => (a.expected_installation_date || '9999').localeCompare(b.expected_installation_date || '9999'));

  const pipelineSummary = {
    pipeline: (customers || []).filter((c) => c.status === 'PIPELINE').length,
    assetOrdered: (customers || []).filter((c) => c.status === 'ASSET_ORDERED').length,
    installationScheduled: (customers || []).filter((c) => c.status === 'INSTALLATION_SCHEDULED').length,
    active: (customers || []).filter((c) => c.status === 'ACTIVE').length,
    inArrears: (customers || []).filter((c) => c.status === 'IN_ARREARS').length,
    defaulted: (customers || []).filter((c) => c.status === 'DEFAULTED').length,
    totalPipelineValueNgn: pipelineCustomers.reduce(
      (sum, c) => sum + Number(c.expected_monthly_payment_ngn || 0) * Number(c.contract_term_months || 0),
      0
    ),
  };

  return {
    assetco,
    assets: cashflow || [],
    faults: faults || [],
    openFaults: (faults || []).filter((f) => f.status === 'open'),
    customerBreakdown,
    recentActivity: events || [],
    pipelineCustomers,
    pipelineSummary,
    allCustomers: (customers || []).map((c) => ({ id: c.id, name: c.name || c.id })),
    allAssetIds: (cashflow || []).map((c) => c.asset_id),
  };
}

/**
 * Corrected hierarchy: assets belong to customers, so the AssetCo view is
 * customer-first (name, asset type(s), deal type, estimated project value),
 * not asset-first. Project value is the sum of total_collected +
 * outstanding_balance across the customer's assets (their real contract
 * value so far); for pipeline customers with no asset yet, it falls back to
 * expected_monthly_payment_ngn * contract_term_months (the same estimate
 * used for "Total Pipeline Value").
 */
export async function getAssetcoCustomers(assetCoId) {
  const supabase = createClient();

  const [{ data: customers }, { data: assets }, { data: cashflow }] = await Promise.all([
    supabase.from('customers').select('*').eq('assetco_id', assetCoId).order('name'),
    supabase.from('assets').select('*').eq('assetco_id', assetCoId),
    supabase.from('cashflow_state').select('*').eq('assetco_id', assetCoId),
  ]);

  const cashflowByAsset = new Map((cashflow || []).map((c) => [c.asset_id, c]));

  return (customers || []).map((customer) => {
    const customerAssets = (assets || [])
      .filter((a) => a.customer_id === customer.id)
      .map((a) => ({ ...a, cashflow: cashflowByAsset.get(a.id) || null }));

    const projectValueNgn = customerAssets.length
      ? customerAssets.reduce((sum, a) => sum + Number(a.cashflow?.total_collected || 0) + Number(a.cashflow?.outstanding_balance || 0), 0)
      : Number(customer.expected_monthly_payment_ngn || 0) * Number(customer.contract_term_months || 0);

    return {
      ...customer,
      assets: customerAssets,
      assetTypes: [...new Set(customerAssets.map((a) => a.asset_type).filter(Boolean))],
      dealType: customerAssets[0]?.ownership_model || null,
      isDefaulted: customerAssets.some((a) => a.cashflow?.is_defaulted),
      projectValueNgn,
    };
  });
}

/**
 * Customer Detail page: profile, deal type, and every asset under them.
 */
export async function getCustomerDetail(customerId) {
  const supabase = createClient();

  const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
  if (!customer) return { customer: null, assets: [], payments: [], faults: [] };

  const [{ data: assets }, { data: payments }] = await Promise.all([
    supabase.from('assets').select('*').eq('customer_id', customerId),
    supabase.from('payments').select('*').eq('customer_id', customerId).order('occurred_at', { ascending: false }),
  ]);

  const assetIds = (assets || []).map((a) => a.id);
  const [{ data: cashflow }, { data: faults }] = assetIds.length
    ? await Promise.all([
        supabase.from('cashflow_state').select('*').in('asset_id', assetIds),
        supabase.from('faults').select('*').in('asset_id', assetIds).order('detected_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const cashflowByAsset = new Map((cashflow || []).map((c) => [c.asset_id, c]));

  return {
    customer,
    assets: (assets || []).map((a) => ({ ...a, cashflow: cashflowByAsset.get(a.id) || null })),
    payments: payments || [],
    faults: faults || [],
  };
}

/**
 * Feature 1 — Pipeline Board: every AssetCo grouped by pipeline_stage, with
 * live cashflow attached for those already in PORTFOLIO_MONITORING.
 */
export async function getPipelineBoard() {
  const supabase = createClient();

  const [{ data: assetcos }, { data: cashflow }] = await Promise.all([
    supabase.from('assetcos').select('*').order('stage_updated_at', { ascending: true }),
    supabase.from('cashflow_state').select('assetco_id, total_collected, outstanding_balance, is_defaulted'),
  ]);

  return (assetcos || []).map((co) => {
    const coCashflow = (cashflow || []).filter((c) => c.assetco_id === co.id);
    return {
      ...co,
      daysInStage: co.stage_updated_at
        ? Math.floor((Date.now() - new Date(co.stage_updated_at).getTime()) / 86400000)
        : null,
      cashflowSummary:
        co.pipeline_stage === 'PORTFOLIO_MONITORING'
          ? {
              totalCollected: coCashflow.reduce((sum, c) => sum + Number(c.total_collected || 0), 0),
              totalOutstanding: coCashflow.reduce((sum, c) => sum + Number(c.outstanding_balance || 0), 0),
              defaultCount: coCashflow.filter((c) => c.is_defaulted).length,
            }
          : null,
    };
  });
}

/**
 * Feature 1 — AssetCo Profile page: company info, pipeline status + stage
 * history. Later features (DREEF, CEF Series, Facility) attach their own
 * panels to this same page.
 */
export async function getAssetcoProfile(assetCoId) {
  const supabase = createClient();

  const [{ data: assetco }, { data: stageLog }, { data: infracredit }, { data: seriesLinks }] = await Promise.all([
    supabase.from('assetcos').select('*').eq('id', assetCoId).maybeSingle(),
    supabase.from('assetco_stage_log').select('*').eq('assetco_id', assetCoId).order('changed_at', { ascending: false }),
    supabase.from('infracredit_relationships').select('*').eq('assetco_id', assetCoId).maybeSingle(),
    supabase.from('assetco_series').select('*, cef_series(id, code, display_name, status)').eq('assetco_id', assetCoId),
  ]);

  return {
    assetco,
    stageLog: stageLog || [],
    infracredit: infracredit || null,
    seriesLinks: (seriesLinks || []).map((l) => ({ ...l, series: l.cef_series })),
  };
}

export async function getCefSeriesList() {
  const supabase = createClient();
  const { data } = await supabase.from('cef_series').select('*').order('code');
  return data || [];
}

/**
 * Feature 3 — Series Overview page: every CEF series with fund size,
 * computed total deployed, and the AssetCos linked to each.
 */
export async function getSeriesOverview() {
  const supabase = createClient();

  const [{ data: series }, { data: links }] = await Promise.all([
    supabase.from('cef_series').select('*').order('code'),
    supabase.from('assetco_series').select('*, assetcos(id, name)').order('created_at', { ascending: false }),
  ]);

  return (series || []).map((s) => {
    const seriesLinks = (links || []).filter((l) => l.series_id === s.id);
    return {
      ...s,
      totalDeployedNgn: seriesLinks.reduce((sum, l) => sum + Number(l.disbursement_amount_ngn || 0), 0),
      links: seriesLinks.map((l) => ({ ...l, assetco: l.assetcos })),
    };
  });
}

/**
 * Feature 2 — DREEF Pipeline view: every AssetCo with an InfraCredit
 * relationship, alongside their CEF pipeline stage and whether CEF has
 * invested — portfolio-wide, not scoped to a single AssetCo.
 */
export async function getDreefPipeline() {
  const supabase = createClient();

  const { data: relationships } = await supabase
    .from('infracredit_relationships')
    .select('*, assetcos(id, name, sector, pipeline_stage)')
    .order('dreef_stage');

  return (relationships || []).map((r) => ({
    ...r,
    assetco: r.assetcos,
  }));
}

/**
 * Asset Registry (SO-5): the unified, authoritative list of every CEF-funded
 * asset across all AssetCos, with sync freshness and default/fault flags —
 * portfolio-level, not scoped to a single AssetCo like the Tier 2 dashboard.
 */
export async function getAssetRegistry() {
  const supabase = createClient();

  const [{ data: assets }, { data: cashflow }, { data: openFaults }, { data: customers }] = await Promise.all([
    supabase.from('assets').select('*').order('assetco_id').order('id'),
    supabase.from('cashflow_state').select('asset_id, is_defaulted'),
    supabase.from('faults').select('asset_id').eq('status', 'open'),
    supabase.from('customers').select('id, name'),
  ]);

  const defaultedAssetIds = new Set((cashflow || []).filter((c) => c.is_defaulted).map((c) => c.asset_id));
  const openFaultAssetIds = new Set((openFaults || []).map((f) => f.asset_id));
  const customerNameById = new Map((customers || []).map((c) => [c.id, c.name]));

  return (assets || []).map((a) => ({
    ...a,
    customerName: customerNameById.get(a.customer_id) || a.customer_id,
    isDefaulted: defaultedAssetIds.has(a.id),
    hasOpenFault: openFaultAssetIds.has(a.id),
  }));
}

/**
 * Tier 3 — Individual Asset View: identity, financial performance, payment
 * history, and fault log for a single asset.
 */
export async function getAssetDetail(assetId) {
  const supabase = createClient();

  const [{ data: asset }, { data: cashflow }, { data: payments }, { data: faults }] = await Promise.all([
    supabase.from('assets').select('*').eq('id', assetId).maybeSingle(),
    supabase.from('cashflow_state').select('*').eq('asset_id', assetId).maybeSingle(),
    supabase.from('payments').select('*').eq('asset_id', assetId).order('occurred_at', { ascending: false }),
    supabase.from('faults').select('*').eq('asset_id', assetId).order('detected_at', { ascending: false }),
  ]);

  return { asset, cashflow, payments: payments || [], faults: faults || [] };
}

/**
 * Feature 7 — CEF Loan Book panel on the Portfolio Dashboard: total capital
 * deployed/repaid/outstanding across all AssetCo facilities, plus a
 * per-AssetCo repayment health breakdown.
 */
export async function getLoanBook() {
  const supabase = createClient();

  const [{ data: facilities }, { data: assetcos }] = await Promise.all([
    supabase.from('cef_facilities').select('*'),
    supabase.from('assetcos').select('id, name'),
  ]);

  const all = facilities || [];
  const totalFacilitiesNgn = all.reduce((sum, f) => sum + Number(f.principal_amount_ngn || 0), 0);
  const totalRepaidNgn = all.reduce((sum, f) => sum + Number(f.total_repaid_ngn || 0), 0);
  const statusPriority = ['IN_DEFAULT', 'IN_ARREARS', 'RESTRUCTURED', 'ACTIVE', 'WRITTEN_OFF', 'FULLY_REPAID'];

  const byAssetCo = (assetcos || [])
    .map((a) => {
      const coFacilities = all.filter((f) => f.assetco_id === a.id);
      if (coFacilities.length === 0) return null;
      const totalFacilityNgn = coFacilities.reduce((sum, f) => sum + Number(f.principal_amount_ngn || 0), 0);
      const totalRepaid = coFacilities.reduce((sum, f) => sum + Number(f.total_repaid_ngn || 0), 0);
      const worstStatus = coFacilities.map((f) => f.facility_status).sort((x, y) => statusPriority.indexOf(x) - statusPriority.indexOf(y))[0];
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

  return {
    totalFacilitiesNgn,
    totalRepaidNgn,
    totalOutstandingNgn: totalFacilitiesNgn - totalRepaidNgn,
    repaymentRatePercent: totalFacilitiesNgn > 0 ? (totalRepaidNgn / totalFacilitiesNgn) * 100 : 0,
    byAssetCo,
  };
}

/**
 * Feature 7 — CEF Facility panel on the AssetCo Profile page.
 */
export async function getAssetcoFacilities(assetCoId) {
  const supabase = createClient();
  const { data } = await supabase.from('cef_facilities').select('*').eq('assetco_id', assetCoId).order('created_at', { ascending: false });
  return data || [];
}
