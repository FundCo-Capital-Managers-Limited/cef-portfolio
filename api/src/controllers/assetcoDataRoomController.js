const { canAccessAssetco } = require('../middleware/requireRole');
const icDocumentService = require('../services/icDocumentService');
const supabase = require('../config/supabase');

async function assertOwnMatter(req, res) {
  const { data: matter, error } = await supabase.from('ic_matters').select('id, assetco_id').eq('id', req.params.matterId).maybeSingle();
  if (error) throw error;
  if (!matter) {
    res.status(404).json({ error: 'Matter not found' });
    return null;
  }
  if (!matter.assetco_id || !canAccessAssetco(req.user, matter.assetco_id)) {
    res.status(403).json({ error: 'Cannot access this matter' });
    return null;
  }
  return matter;
}

async function listMatters(req, res, next) {
  try {
    if (!req.user.assetcoId) return res.status(403).json({ error: 'No AssetCo associated with this account' });
    const matters = await icDocumentService.listMattersForAssetco(req.user.assetcoId);
    res.status(200).json({ matters });
  } catch (err) {
    next(err);
  }
}

async function submitDocument(req, res, next) {
  try {
    if (!(await assertOwnMatter(req, res))) return;
    const { title, classification, sharepointUrl } = req.body;
    const document = await icDocumentService.submitByAssetco(req.params.matterId, { title, classification, sharepointUrl }, req.user);
    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    if (!(await assertOwnMatter(req, res))) return;
    // AssetCo reps see everything they've submitted, not just what's been
    // approved — the visibility gate in listDocumentsForMatter only applies
    // to board_member (IC-external), and an AssetCo rep isn't that.
    const documents = await icDocumentService.listDocumentsForMatter(req.params.matterId, req.user);
    res.status(200).json({ documents });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMatters, submitDocument, listDocuments };
