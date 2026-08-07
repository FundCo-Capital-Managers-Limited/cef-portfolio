const icDocumentService = require('../services/icDocumentService');

async function create(req, res, next) {
  try {
    const { title, classification, sharepointUrl } = req.body;
    const document = await icDocumentService.createDocument(req.params.matterId, { title, classification, sharepointUrl }, req.user);
    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}

async function listForMatter(req, res, next) {
  try {
    const documents = await icDocumentService.listDocumentsForMatter(req.params.matterId, req.user);
    res.status(200).json({ documents });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const document = await icDocumentService.getDocument(req.params.id, req.user);
    res.status(200).json({ document });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { status, sharepointUrl, title, classification } = req.body;
    const document = await icDocumentService.updateDocument(req.params.id, { status, sharepointUrl, title, classification }, req.user);
    res.status(200).json({ document });
  } catch (err) {
    next(err);
  }
}

async function confirm(req, res, next) {
  try {
    const document = await icDocumentService.confirmUpload(req.params.id, req.user);
    res.status(200).json({ document });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listForMatter, get, update, confirm };
