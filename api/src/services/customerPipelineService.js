const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { CUSTOMER_STATUSES, PIPELINE_CUSTOMER_STATUSES } = require('../utils/assetcoEnums');

async function getSummary(assetCoId) {
  const { data, error } = await supabase.from('customers').select('status, expected_monthly_payment_ngn').eq('assetco_id', assetCoId);
  if (error) throw error;

  const counts = {
    pipeline: 0,
    asset_ordered: 0,
    installation_scheduled: 0,
    active: 0,
    in_arrears: 0,
    defaulted: 0,
    churned: 0,
    total: 0,
  };
  let pipelineMonthlyValueNgn = 0;

  for (const c of data || []) {
    counts.total += 1;
    const key = c.status.toLowerCase();
    if (key in counts) counts[key] += 1;
    if (PIPELINE_CUSTOMER_STATUSES.includes(c.status)) {
      pipelineMonthlyValueNgn += Number(c.expected_monthly_payment_ngn || 0);
    }
  }

  return { ...counts, pipeline_monthly_value_ngn: pipelineMonthlyValueNgn };
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

async function getPipelineCustomers(assetCoId, { status, state } = {}) {
  let query = supabase.from('customers').select('*').eq('assetco_id', assetCoId);
  if (status) {
    query = query.eq('status', status);
  }
  if (state) {
    query = query.eq('location_state', state);
  }
  const { data, error } = await query;
  if (error) throw error;

  const pipelineOnly = status
    ? data || []
    : (data || []).filter((c) => PIPELINE_CUSTOMER_STATUSES.includes(c.status));

  return pipelineOnly
    .map((c) => ({ ...c, days_since_contract: daysSince(c.contract_signed_date) }))
    .sort((a, b) => {
      if (!a.expected_installation_date) return 1;
      if (!b.expected_installation_date) return -1;
      return a.expected_installation_date.localeCompare(b.expected_installation_date);
    });
}

async function getCustomer(customerId) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateStatus(customerId, toStatus, notes, user) {
  if (!CUSTOMER_STATUSES.includes(toStatus)) {
    const err = new Error(`status must be one of: ${CUSTOMER_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const customer = await getCustomer(customerId);
  if (!customer) {
    const err = new Error('Customer not found');
    err.status = 404;
    throw err;
  }

  const fromStatus = customer.status;

  const { error: updateError } = await supabase
    .from('customers')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', customerId);
  if (updateError) throw updateError;

  const { error: logError } = await supabase.from('customer_stage_log').insert({
    customer_id: customerId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: user.id,
    notes: notes || null,
  });
  if (logError) throw logError;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: customer.assetco_id,
    action: 'CUSTOMER_STATUS_CHANGED',
    entityType: 'customer',
    entityId: customerId,
    details: { fromStatus, toStatus, notes },
  });

  return getCustomer(customerId);
}

module.exports = { getSummary, getPipelineCustomers, getCustomer, updateStatus };
