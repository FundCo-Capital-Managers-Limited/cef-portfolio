const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');

const STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EXECUTED', 'SUPERSEDED', 'EXPIRED', 'ARCHIVED'];

async function assertMatterExists(matterId) {
  const { data: matter, error } = await supabase.from('ic_matters').select('id, assetco_id').eq('id', matterId).maybeSingle();
  if (error) throw error;
  if (!matter) throw Object.assign(new Error('Matter not found'), { status: 404 });
  return matter;
}

async function createDocument(matterId, { title, classification, sharepointUrl }, user) {
  if (!title || !classification) {
    throw Object.assign(new Error('title and classification are required'), { status: 400 });
  }
  const matter = await assertMatterExists(matterId);

  const { data: doc, error } = await supabase
    .from('ic_documents')
    .insert({
      matter_id: matterId,
      title,
      classification,
      status: 'DRAFT',
      sharepoint_url: sharepointUrl || null,
      created_by_user_id: user.id,
      created_by_email: user.email,
    })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: matter.assetco_id,
    action: 'IC_DOCUMENT_ADDED',
    entityType: 'ic_document',
    entityId: doc.id,
    details: { matterId, title, classification },
  });

  return doc;
}

async function listDocumentsForMatter(matterId) {
  await assertMatterExists(matterId);
  const { data, error } = await supabase
    .from('ic_documents')
    .select('*')
    .eq('matter_id', matterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getDocument(documentId) {
  const { data: doc, error } = await supabase.from('ic_documents').select('*').eq('id', documentId).maybeSingle();
  if (error) throw error;
  if (!doc) throw Object.assign(new Error('Document not found'), { status: 404 });
  return doc;
}

async function updateDocument(documentId, { status, sharepointUrl, title, classification }, user) {
  if (status !== undefined && !STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${STATUSES.join(', ')}`), { status: 400 });
  }

  const existing = await getDocument(documentId);
  const matter = await assertMatterExists(existing.matter_id);
  // Snapshotted before the update call — see icMatterService.updateMatter
  // for why (some clients, including the fake one in tests, return/mutate
  // the same row object in place).
  const previousStatus = existing.status;

  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (sharepointUrl !== undefined) patch.sharepoint_url = sharepointUrl;
  if (title !== undefined) patch.title = title;
  if (classification !== undefined) patch.classification = classification;

  const { data: updated, error } = await supabase.from('ic_documents').update(patch).eq('id', documentId).select().single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: matter.assetco_id,
    action: 'IC_DOCUMENT_UPDATED',
    entityType: 'ic_document',
    entityId: documentId,
    details: { fromStatus: previousStatus, status, sharepointUrl },
  });

  return updated;
}

// Separate from the general update — confirming carries a specific meaning
// ("I uploaded this to the dataroom and it's shared with the right people")
// distinct from just editing the title/classification, so it gets its own
// audited action and can't be silently set by a plain PATCH.
async function confirmUpload(documentId, user) {
  const existing = await getDocument(documentId);
  if (!existing.sharepoint_url) {
    throw Object.assign(new Error('Add the SharePoint URL before confirming the upload'), { status: 400 });
  }
  const matter = await assertMatterExists(existing.matter_id);

  const { data: updated, error } = await supabase
    .from('ic_documents')
    .update({
      confirmed_by_user_id: user.id,
      confirmed_by_email: user.email,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: matter.assetco_id,
    action: 'IC_DOCUMENT_UPLOAD_CONFIRMED',
    entityType: 'ic_document',
    entityId: documentId,
    details: { title: existing.title },
  });

  return updated;
}

module.exports = { createDocument, listDocumentsForMatter, getDocument, updateDocument, confirmUpload, STATUSES };
