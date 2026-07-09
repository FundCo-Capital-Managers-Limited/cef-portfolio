const crypto = require('crypto');
const supabase = require('../config/supabase');
const { recordEvent, markProcessed, markProcessingError } = require('./eventService');
const { processEvent } = require('./eventProcessor');
const { recordAudit } = require('./auditLog');

/**
 * Manual entry doesn't call the Event Ingestion API — these routes construct
 * the same CIS-shaped payload the API path would have received, store it
 * with source='MANUAL_ENTRY', and dispatch through the same eventProcessor
 * used by real webhooks. This guarantees identical downstream processing
 * (Cashflow Engine, Alert Engine) regardless of how the data arrived —
 * the only difference is the audit trail recording who entered it by hand.
 */
async function submitManualEvent(payload, user, auditAction) {
  const event = await recordEvent(payload, 'MANUAL_ENTRY');

  try {
    await processEvent(payload, event.id);
    await markProcessed(event.id);
  } catch (err) {
    await markProcessingError(event.id, err.message);
  }

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorAssetcoId: payload.assetCoId,
    action: auditAction,
    entityType: payload.eventType.split('.')[0],
    entityId: payload.assetId || payload.customerId || payload.assetCoId,
    details: payload,
  });

  return event;
}

async function createCustomer(body, user) {
  const customerId = `MANUAL-${crypto.randomUUID()}`;
  const payload = {
    eventType: 'customer.created',
    assetCoId: body.assetCoId,
    customerId,
    timestamp: new Date().toISOString(),
    metadata: { name: body.customerName },
    status: body.status || undefined,
    contractSignedDate: body.contractSignedDate,
    expectedInstallationDate: body.expectedInstallationDate,
    expectedMonthlyPaymentNgn: body.monthlyPaymentNgn,
    contractTermMonths: body.contractTermMonths,
    locationState: body.state,
    locationLga: body.lga,
    customerSegment: body.segment,
  };

  await submitManualEvent(payload, user, 'MANUAL_CUSTOMER_CREATED');

  const { error } = await supabase.from('customers').update({ data_source: 'MANUAL' }).eq('id', customerId);
  if (error) throw error;

  const { data: customer, error: fetchError } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
  if (fetchError) throw fetchError;
  return customer;
}

async function createAsset(body, user) {
  const assetId = `MANUAL-${crypto.randomUUID()}`;
  const payload = {
    eventType: 'asset.deployed',
    assetCoId: body.assetCoId,
    assetId,
    customerId: body.customerId,
    timestamp: body.deploymentDate ? new Date(body.deploymentDate).toISOString() : new Date().toISOString(),
    oemModel: body.oemModel,
    oemManufacturer: body.oemManufacturer,
    remoteControlSupported: body.remoteControlSupported ?? false,
  };

  await submitManualEvent(payload, user, 'MANUAL_ASSET_CREATED');

  const fields = { data_source: 'MANUAL' };
  if (body.cefSeriesId) fields.cef_series_id = body.cefSeriesId;
  const { error } = await supabase.from('assets').update(fields).eq('id', assetId);
  if (error) throw error;

  const { data: asset, error: fetchError } = await supabase.from('assets').select('*').eq('id', assetId).maybeSingle();
  if (fetchError) throw fetchError;
  return asset;
}

async function createPayment(body, user) {
  const eventType = body.status === 'RECEIVED' ? 'payment.received' : 'payment.missed';
  const payload = {
    eventType,
    assetCoId: body.assetCoId,
    assetId: body.assetId,
    customerId: body.customerId,
    amount: body.amount,
    currency: body.currency || 'NGN',
    timestamp: body.paidDate ? new Date(body.paidDate).toISOString() : new Date().toISOString(),
    sourceRef: `manual-${body.period}`,
    metadata: { period: body.period, notes: body.notes },
  };

  const event = await submitManualEvent(payload, user, 'MANUAL_PAYMENT_ENTRY');

  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('event_id', event.id)
    .maybeSingle();
  if (error) throw error;
  if (!payment) return null;

  const { error: updateError } = await supabase
    .from('payments')
    .update({ data_source: 'MANUAL', entered_by: user.id })
    .eq('id', payment.id);
  if (updateError) throw updateError;

  return { ...payment, data_source: 'MANUAL', entered_by: user.id };
}

async function createFault(body, user) {
  const payload = {
    eventType: 'asset.fault.detected',
    assetCoId: body.assetCoId,
    assetId: body.assetId,
    timestamp: body.detectedAt ? new Date(body.detectedAt).toISOString() : new Date().toISOString(),
    metadata: { faultCode: body.faultCode, faultDescription: body.faultDescription, severity: body.severity },
  };

  await submitManualEvent(payload, user, 'MANUAL_FAULT_REPORTED');

  const { data: fault, error } = await supabase
    .from('faults')
    .select('*')
    .eq('asset_id', body.assetId)
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return fault;
}

module.exports = { createCustomer, createAsset, createPayment, createFault };
