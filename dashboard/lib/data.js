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
 * Tier 1 — Portfolio Dashboard: cashflow totals, default tracker, fault
 * summary, and sync freshness, aggregated across all AssetCos.
 */
export async function getPortfolioSummary() {
  const supabase = createClient();

  const [{ data: assetcos }, { data: cashflow }, { data: faults }, { data: alerts }, { data: syncState }] =
    await Promise.all([
      supabase.from('assetcos').select('id, name, is_active'),
      supabase.from('cashflow_state').select('*'),
      supabase.from('faults').select('id, assetco_id, status'),
      supabase.from('alerts').select('*').order('sent_at', { ascending: false }).limit(10),
      supabase.from('sync_state').select('*'),
    ]);

  const totalCollected = (cashflow || []).reduce((sum, c) => sum + Number(c.total_collected || 0), 0);
  const totalOutstanding = (cashflow || []).reduce((sum, c) => sum + Number(c.outstanding_balance || 0), 0);
  const defaultCount = (cashflow || []).filter((c) => c.is_defaulted).length;
  const openFaultCount = (faults || []).filter((f) => f.status === 'open').length;

  const assetCoCards = (assetcos || []).map((co) => {
    const coCashflow = (cashflow || []).filter((c) => c.assetco_id === co.id);
    const coFaults = (faults || []).filter((f) => f.assetco_id === co.id && f.status === 'open');
    const sync = (syncState || []).find((s) => s.assetco_id === co.id);
    return {
      id: co.id,
      name: co.name,
      isActive: co.is_active,
      activeAssets: coCashflow.length,
      monthlyCollection: coCashflow.reduce((sum, c) => sum + Number(c.total_collected || 0), 0),
      defaultCount: coCashflow.filter((c) => c.is_defaulted).length,
      openFaultCount: coFaults.length,
      lastSyncedAt: sync?.last_heartbeat_at || null,
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

  const [{ data: assetco }, { data: cashflow }, { data: faults }, { data: events }] = await Promise.all([
    supabase.from('assetcos').select('*').eq('id', assetCoId).maybeSingle(),
    supabase.from('cashflow_state').select('*').eq('assetco_id', assetCoId),
    supabase.from('faults').select('*').eq('assetco_id', assetCoId),
    supabase
      .from('events')
      .select('id, event_type, asset_id, received_at')
      .eq('assetco_id', assetCoId)
      .order('received_at', { ascending: false })
      .limit(20),
  ]);

  const customerBreakdown = {
    current: (cashflow || []).filter((c) => !c.is_defaulted && c.missed_count === 0).length,
    arrears1: (cashflow || []).filter((c) => !c.is_defaulted && c.missed_count === 1).length,
    arrears2Plus: (cashflow || []).filter((c) => !c.is_defaulted && c.missed_count >= 2).length,
    defaulted: (cashflow || []).filter((c) => c.is_defaulted).length,
  };

  return {
    assetco,
    assets: cashflow || [],
    faults: faults || [],
    openFaults: (faults || []).filter((f) => f.status === 'open'),
    customerBreakdown,
    recentActivity: events || [],
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

  const [{ data: assetco }, { data: stageLog }] = await Promise.all([
    supabase.from('assetcos').select('*').eq('id', assetCoId).maybeSingle(),
    supabase.from('assetco_stage_log').select('*').eq('assetco_id', assetCoId).order('changed_at', { ascending: false }),
  ]);

  return { assetco, stageLog: stageLog || [] };
}

/**
 * Asset Registry (SO-5): the unified, authoritative list of every CEF-funded
 * asset across all AssetCos, with sync freshness and default/fault flags —
 * portfolio-level, not scoped to a single AssetCo like the Tier 2 dashboard.
 */
export async function getAssetRegistry() {
  const supabase = createClient();

  const [{ data: assets }, { data: cashflow }, { data: openFaults }] = await Promise.all([
    supabase.from('assets').select('*').order('assetco_id').order('id'),
    supabase.from('cashflow_state').select('asset_id, is_defaulted'),
    supabase.from('faults').select('asset_id').eq('status', 'open'),
  ]);

  const defaultedAssetIds = new Set((cashflow || []).filter((c) => c.is_defaulted).map((c) => c.asset_id));
  const openFaultAssetIds = new Set((openFaults || []).map((f) => f.asset_id));

  return (assets || []).map((a) => ({
    ...a,
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
