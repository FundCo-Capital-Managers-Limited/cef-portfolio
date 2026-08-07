const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const notificationService = require('./notificationService');

async function assertMatterExists(matterId) {
  const { data: matter, error } = await supabase.from('ic_matters').select('id, title, assetco_id, created_by_email, deal_lead_user_id').eq('id', matterId).maybeSingle();
  if (error) throw error;
  if (!matter) throw Object.assign(new Error('Matter not found'), { status: 404 });
  return matter;
}

/**
 * Notifies the matter's creator and deal lead (if any) so a question raised
 * ahead of the meeting actually reaches whoever can answer it — not every IC
 * member, since that would fan out to everyone on every question.
 */
async function notifyMatterOwners(matter, commentBody, actorEmail) {
  const recipientEmails = [matter.created_by_email];
  if (matter.deal_lead_user_id) {
    const { data: lead } = await supabase.from('users').select('email').eq('id', matter.deal_lead_user_id).maybeSingle();
    if (lead?.email) recipientEmails.push(lead.email);
  }
  const targets = [...new Set(recipientEmails)].filter((email) => email && email !== actorEmail);
  if (!targets.length) return;

  await notificationService.notify({
    type: 'ic_matter_comment_added',
    message: `${actorEmail} commented on "${matter.title}": ${commentBody.slice(0, 140)}`,
    icMatterId: matter.id,
    createdByEmail: actorEmail,
    recipientEmails: targets,
  });
}

async function addComment(matterId, body, user) {
  if (!body || !body.trim()) throw Object.assign(new Error('body is required'), { status: 400 });
  const matter = await assertMatterExists(matterId);

  const { data: comment, error } = await supabase
    .from('ic_matter_comments')
    .insert({ matter_id: matterId, body, author_user_id: user.id, author_email: user.email })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: matter.assetco_id,
    action: 'IC_MATTER_COMMENT_ADDED',
    entityType: 'ic_matter',
    entityId: matterId,
    details: { commentId: comment.id },
  });

  await notifyMatterOwners(matter, body, user.email);

  return comment;
}

async function listComments(matterId) {
  await assertMatterExists(matterId);
  const { data, error } = await supabase.from('ic_matter_comments').select('*').eq('matter_id', matterId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

module.exports = { addComment, listComments };
