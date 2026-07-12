const { canAccessAssetco } = require('../middleware/requireRole');
const seriesService = require('../services/seriesService');

const INSTRUMENT_TYPES = ['EQUITY', 'DEBT', 'CONVERTIBLE', 'GRANT'];
const LINK_STATUSES = ['CANDIDATE', 'COMMITTED', 'DISBURSED', 'EXITED'];
const SERIES_STATUSES = ['OPEN', 'CLOSED', 'UPCOMING', 'PLANNING'];
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

async function listAll(req, res, next) {
  try {
    const series = await seriesService.listSeries();
    res.status(200).json({ series });
  } catch (err) {
    next(err);
  }
}

async function assetcosInSeries(req, res, next) {
  try {
    const result = await seriesService.getAssetcosInSeries(req.params.code);
    if (!result) return res.status(404).json({ error: 'Series not found' });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function seriesForAssetco(req, res, next) {
  try {
    if (!canAccessAssetco(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Cannot access this AssetCo' });
    }
    const links = await seriesService.getSeriesForAssetco(req.params.id);
    return res.status(200).json({ links });
  } catch (err) {
    return next(err);
  }
}

async function linkToSeries(req, res, next) {
  try {
    if (!['management', 'it_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can link an AssetCo to a series' });
    }

    const { seriesId, disbursementAmountNgn, disbursementDate, instrumentType, status, notes } = req.body;
    if (!seriesId) return res.status(400).json({ error: 'seriesId is required' });
    if (instrumentType && !INSTRUMENT_TYPES.includes(instrumentType)) {
      return res.status(400).json({ error: `instrumentType must be one of: ${INSTRUMENT_TYPES.join(', ')}` });
    }
    if (status && !LINK_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${LINK_STATUSES.join(', ')}` });
    }

    const fields = {
      series_id: seriesId,
      disbursement_amount_ngn: disbursementAmountNgn ?? null,
      disbursement_date: disbursementDate ?? null,
      instrument_type: instrumentType || 'DEBT',
      status: status || 'CANDIDATE',
      notes: notes ?? null,
    };

    const links = await seriesService.linkAssetcoToSeries(req.params.id, fields, req.user);
    return res.status(200).json({ links });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    if (!['management', 'it_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can create a series' });
    }

    const { code, displayName, status, totalFundSizeNgn, closeDate, description } = req.body;
    if (!code || !displayName) return res.status(400).json({ error: 'code and displayName are required' });
    if (!CODE_PATTERN.test(code)) {
      return res.status(400).json({ error: 'code must be uppercase letters/numbers/underscores, starting with a letter (e.g. SERIES_D)' });
    }
    if (status && !SERIES_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${SERIES_STATUSES.join(', ')}` });
    }

    const series = await seriesService.createSeries(
      {
        code,
        display_name: displayName,
        status: status || 'PLANNING',
        total_fund_size_ngn: totalFundSizeNgn ?? null,
        close_date: closeDate ?? null,
        description: description ?? null,
      },
      req.user
    );
    return res.status(201).json({ series });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (!['management', 'it_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEF Management or IT Admin can delete a series' });
    }
    await seriesService.deleteSeries(req.params.id, req.user);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listAll, assetcosInSeries, seriesForAssetco, linkToSeries, create, remove };
