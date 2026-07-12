const supabase = require('../config/supabase');

/**
 * Reference implementation of the mandatory AssetCo reconciliation endpoints
 * (architecture doc §7.3) — mounted at /mock-assetco/:assetCoId/cef/*.
 *
 * This exists so the Reconciliation Service has something real to call
 * against before a genuine AssetCo platform implements these endpoints
 * themselves (Week 5's DemoSolar harness and, eventually, the first live
 * AssetCo). It simply reflects CEF-PIP's own local data back — a real
 * AssetCo's responses would come from their own database instead. Field
 * names below match what the architecture doc specifies AssetCos must return.
 */

async function getAssets(req, res, next) {
  try {
    const { assetCoId } = req.params;
    const { data, error } = await supabase.from('assets').select('*').eq('assetco_id', assetCoId);
    if (error) throw error;

    res.status(200).json(
      data.map((a) => ({
        assetId: a.id,
        customerId: a.customer_id,
        status: a.status,
        deployedAt: a.deployed_at,
        updatedAt: a.updated_at,
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function getPayments(req, res, next) {
  try {
    const { assetCoId } = req.params;
    const { from, to } = req.query;

    let query = supabase.from('payments').select('*').eq('assetco_id', assetCoId);
    if (from) query = query.gte('occurred_at', from);
    if (to) query = query.lte('occurred_at', to);
    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json(
      data.map((p) => ({
        assetId: p.asset_id,
        customerId: p.customer_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        sourceRef: p.source_ref,
        occurredAt: p.occurred_at,
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function getFaults(req, res, next) {
  try {
    const { assetCoId } = req.params;
    const { status } = req.query;

    let query = supabase.from('faults').select('*').eq('assetco_id', assetCoId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json(
      data.map((f) => ({
        assetId: f.asset_id,
        status: f.status,
        detectedAt: f.detected_at,
        resolvedAt: f.resolved_at,
      }))
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { getAssets, getPayments, getFaults };
