const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');

async function listSeries() {
  const [{ data: series, error: seriesError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from('cef_series').select('*').order('code'),
    supabase.from('assetco_series').select('series_id, assetco_id, disbursement_amount_ngn'),
  ]);
  if (seriesError) throw seriesError;
  if (linksError) throw linksError;

  return (series || []).map((s) => {
    const seriesLinks = (links || []).filter((l) => l.series_id === s.id);
    return {
      ...s,
      total_deployed_ngn: seriesLinks.reduce((sum, l) => sum + Number(l.disbursement_amount_ngn || 0), 0),
      assetco_count: seriesLinks.length,
    };
  });
}

async function getSeriesByCode(code) {
  const { data, error } = await supabase.from('cef_series').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data;
}

async function getAssetcosInSeries(code) {
  const series = await getSeriesByCode(code);
  if (!series) return null;

  const { data: links, error } = await supabase.from('assetco_series').select('*').eq('series_id', series.id);
  if (error) throw error;

  const assetcoIds = (links || []).map((l) => l.assetco_id);
  const { data: assetcos, error: assetcosError } = assetcoIds.length
    ? await supabase.from('assetcos').select('id, name, sector, pipeline_stage').in('id', assetcoIds)
    : { data: [], error: null };
  if (assetcosError) throw assetcosError;

  const byId = new Map((assetcos || []).map((a) => [a.id, a]));
  return { series, links: (links || []).map((l) => ({ ...l, assetco: byId.get(l.assetco_id) || null })) };
}

async function getSeriesForAssetco(assetCoId) {
  const { data: links, error } = await supabase.from('assetco_series').select('*').eq('assetco_id', assetCoId);
  if (error) throw error;

  const seriesIds = (links || []).map((l) => l.series_id);
  const { data: seriesRows, error: seriesError } = seriesIds.length
    ? await supabase.from('cef_series').select('id, code, display_name, status').in('id', seriesIds)
    : { data: [], error: null };
  if (seriesError) throw seriesError;

  const byId = new Map((seriesRows || []).map((s) => [s.id, s]));
  return (links || []).map((l) => ({ ...l, series: byId.get(l.series_id) || null }));
}

async function linkAssetcoToSeries(assetCoId, fields, user) {
  const { data: series, error: seriesError } = await supabase
    .from('cef_series')
    .select('id')
    .eq('id', fields.series_id)
    .maybeSingle();
  if (seriesError) throw seriesError;
  if (!series) {
    const err = new Error('seriesId does not exist');
    err.status = 400;
    throw err;
  }

  const { error } = await supabase.from('assetco_series').upsert(
    { assetco_id: assetCoId, ...fields, updated_at: new Date().toISOString() },
    { onConflict: 'assetco_id,series_id' }
  );
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorAssetcoId: assetCoId,
    action: 'ASSETCO_LINKED_TO_SERIES',
    entityType: 'assetco_series',
    entityId: `${assetCoId}:${fields.series_id}`,
    details: fields,
  });

  return getSeriesForAssetco(assetCoId);
}

module.exports = { listSeries, getSeriesByCode, getAssetcosInSeries, getSeriesForAssetco, linkAssetcoToSeries };
