const supabase = require('../config/supabase');

/**
 * Persists a validated, signature-verified event to the append-only events log.
 * Downstream processing (Cashflow/Alert engines) consumes this table asynchronously
 * in later weeks — Week 1 scope is ingestion + storage only.
 */
async function recordEvent(payload) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      event_type: payload.eventType,
      assetco_id: payload.assetCoId,
      asset_id: payload.assetId || null,
      customer_id: payload.customerId || null,
      amount: payload.amount ?? null,
      currency: payload.currency || null,
      source_ref: payload.sourceRef || null,
      metadata: payload.metadata || null,
      raw_payload: payload,
      received_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

async function markProcessed(eventId) {
  const { error } = await supabase
    .from('events')
    .update({ processed_at: new Date().toISOString(), processing_error: null })
    .eq('id', eventId);
  if (error) throw error;
}

async function markProcessingError(eventId, message) {
  const { error } = await supabase
    .from('events')
    .update({ processing_error: message })
    .eq('id', eventId);
  if (error) throw error;
}

module.exports = { recordEvent, markProcessed, markProcessingError };
