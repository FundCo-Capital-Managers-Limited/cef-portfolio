const supabase = require('../config/supabase');
const { ensureAssetStub, ensureCustomerStub } = require('./registryStubs');
const { sendDefaultAlert, sendFaultAlert } = require('./alertEngine');

async function getCashflowState(assetId) {
  const { data, error } = await supabase
    .from('cashflow_state')
    .select('*')
    .eq('asset_id', assetId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertCashflowState(state) {
  const { error } = await supabase
    .from('cashflow_state')
    .upsert({ ...state, updated_at: new Date().toISOString() }, { onConflict: 'asset_id' });
  if (error) throw error;
}

async function insertPayment(payload, status, eventId) {
  const { error } = await supabase.from('payments').insert({
    assetco_id: payload.assetCoId,
    asset_id: payload.assetId,
    customer_id: payload.customerId || null,
    amount: payload.amount,
    currency: payload.currency,
    status,
    source_ref: payload.sourceRef || null,
    occurred_at: payload.timestamp,
    event_id: eventId,
  });
  if (error) throw error;
}

/**
 * payment.received: recalculate outstanding balance, clear missed/default flags.
 */
async function handlePaymentReceived(payload, eventId) {
  await ensureAssetStub(payload.assetCoId, payload.assetId);
  await ensureCustomerStub(payload.assetCoId, payload.customerId);
  await insertPayment(payload, 'received', eventId);

  const existing = await getCashflowState(payload.assetId);
  const totalCollected = (existing?.total_collected || 0) + payload.amount;
  const outstandingBalance = Math.max((existing?.outstanding_balance || 0) - payload.amount, 0);

  await upsertCashflowState({
    asset_id: payload.assetId,
    assetco_id: payload.assetCoId,
    customer_id: payload.customerId || existing?.customer_id || null,
    total_collected: totalCollected,
    outstanding_balance: outstandingBalance,
    missed_count: 0,
    is_defaulted: false,
    defaulted_at: null,
  });
}

/**
 * payment.missed: mark overdue, increment missed_count, add to outstanding balance.
 * Does not itself flag default — that is a separate payment.defaulted event,
 * emitted by the AssetCo once its own default threshold is crossed.
 */
async function handlePaymentMissed(payload, eventId) {
  await ensureAssetStub(payload.assetCoId, payload.assetId);
  await ensureCustomerStub(payload.assetCoId, payload.customerId);
  await insertPayment(payload, 'missed', eventId);

  const existing = await getCashflowState(payload.assetId);
  await upsertCashflowState({
    asset_id: payload.assetId,
    assetco_id: payload.assetCoId,
    customer_id: payload.customerId || existing?.customer_id || null,
    total_collected: existing?.total_collected || 0,
    outstanding_balance: (existing?.outstanding_balance || 0) + payload.amount,
    missed_count: (existing?.missed_count || 0) + 1,
    is_defaulted: existing?.is_defaulted || false,
    defaulted_at: existing?.defaulted_at || null,
  });
}

/**
 * payment.defaulted: flag asset/customer as defaulted and trigger the Alert Engine.
 */
async function handlePaymentDefaulted(payload, eventId) {
  await ensureAssetStub(payload.assetCoId, payload.assetId);
  await ensureCustomerStub(payload.assetCoId, payload.customerId);
  await insertPayment(payload, 'defaulted', eventId);

  const existing = await getCashflowState(payload.assetId);
  await upsertCashflowState({
    asset_id: payload.assetId,
    assetco_id: payload.assetCoId,
    customer_id: payload.customerId || existing?.customer_id || null,
    total_collected: existing?.total_collected || 0,
    outstanding_balance: existing?.outstanding_balance || 0,
    missed_count: existing?.missed_count || 0,
    is_defaulted: true,
    defaulted_at: payload.timestamp,
  });

  await sendDefaultAlert(payload, eventId);
}

/**
 * asset.fault.detected: open a fault record and trigger the Alert Engine.
 */
async function handleFaultDetected(payload, eventId) {
  await ensureAssetStub(payload.assetCoId, payload.assetId);

  const { error } = await supabase.from('faults').insert({
    assetco_id: payload.assetCoId,
    asset_id: payload.assetId,
    status: 'open',
    detected_at: payload.timestamp,
    detail: payload.metadata || null,
    event_id: eventId,
  });
  if (error) throw error;

  await sendFaultAlert(payload, eventId);
}

/**
 * asset.fault.resolved: close the most recent open fault for this asset.
 */
async function handleFaultResolved(payload) {
  const { data: openFault, error: selectError } = await supabase
    .from('faults')
    .select('id')
    .eq('asset_id', payload.assetId)
    .eq('status', 'open')
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (!openFault) return;

  const { error: updateError } = await supabase
    .from('faults')
    .update({ status: 'resolved', resolved_at: payload.timestamp })
    .eq('id', openFault.id);
  if (updateError) throw updateError;
}

module.exports = {
  handlePaymentReceived,
  handlePaymentMissed,
  handlePaymentDefaulted,
  handleFaultDetected,
  handleFaultResolved,
};
