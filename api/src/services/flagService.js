const supabase = require('../config/supabase');
const notificationService = require('./notificationService');
const { recordAudit } = require('./auditLog');

// Who gets notified when Risk (or anyone) raises/comments on a flag. Not
// every CEF-wide role - ops and executive are deliberately excluded per the
// original ask ("finance people and management and IT will see the
// notifications, but not the others"). The flag itself is still visible to
// every CEF-wide role via RLS/is_cef_user() if they navigate to the Flags
// page directly; this list only controls who gets pushed a notification.
const FLAG_NOTIFICATION_ROLES = ['management', 'it_admin', 'finance'];

async function recipientEmailsForFlag(excludeEmail) {
  const { data, error } = await supabase.from('users').select('email').in('role', FLAG_NOTIFICATION_ROLES);
  if (error) throw error;
  return (data || []).map((u) => u.email).filter((email) => email !== excludeEmail);
}

async function createFlag({ entityType, entityId, assetcoId, title, description }, user) {
  if (!entityType || !title) throw Object.assign(new Error('entityType and title are required'), { status: 400 });

  const { data: flag, error } = await supabase
    .from('flags')
    .insert({
      entity_type: entityType,
      entity_id: entityId || null,
      assetco_id: assetcoId || null,
      title,
      description: description || null,
      status: 'open',
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
    actorAssetcoId: assetcoId || null,
    action: 'FLAG_RAISED',
    entityType,
    entityId: entityId || flag.id,
    details: { flagId: flag.id, title },
  });

  const recipientEmails = await recipientEmailsForFlag(user.email);
  await notificationService.notify({
    type: 'flag_raised',
    message: `${user.email} flagged "${title}"`,
    flagId: flag.id,
    createdByEmail: user.email,
    recipientEmails,
  });

  return flag;
}

async function listFlags() {
  const { data, error } = await supabase.from('flags').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getFlag(flagId) {
  const { data: flag, error } = await supabase.from('flags').select('*').eq('id', flagId).maybeSingle();
  if (error) throw error;
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });

  const [{ data: comments, error: commentsError }, { data: views, error: viewsError }] = await Promise.all([
    supabase.from('flag_comments').select('*').eq('flag_id', flagId).order('created_at', { ascending: true }),
    supabase.from('flag_views').select('*').eq('flag_id', flagId),
  ]);
  if (commentsError) throw commentsError;
  if (viewsError) throw viewsError;

  return { ...flag, comments: comments || [], views: views || [] };
}

async function recordView(flagId, user) {
  const { error } = await supabase
    .from('flag_views')
    .upsert({ flag_id: flagId, user_id: user.id, viewed_at: new Date().toISOString() }, { onConflict: 'flag_id,user_id' });
  if (error) throw error;
}

async function addComment(flagId, body, user) {
  if (!body) throw Object.assign(new Error('body is required'), { status: 400 });

  const { data: flag, error: flagError } = await supabase.from('flags').select('*').eq('id', flagId).maybeSingle();
  if (flagError) throw flagError;
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });

  const { data: comment, error } = await supabase
    .from('flag_comments')
    .insert({ flag_id: flagId, author_user_id: user.id, author_email: user.email, body })
    .select()
    .single();
  if (error) throw error;

  const recipientEmails = await recipientEmailsForFlag(user.email);
  await notificationService.notify({
    type: 'flag_commented',
    message: `${user.email} commented on "${flag.title}"`,
    flagId,
    createdByEmail: user.email,
    recipientEmails,
  });

  return comment;
}

async function updateStatus(flagId, status, user) {
  if (!['open', 'acknowledged', 'resolved'].includes(status)) {
    throw Object.assign(new Error('status must be one of: open, acknowledged, resolved'), { status: 400 });
  }

  const { data: flag, error: flagError } = await supabase.from('flags').select('*').eq('id', flagId).maybeSingle();
  if (flagError) throw flagError;
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });

  const fields = { status };
  if (status === 'resolved') {
    fields.resolved_at = new Date().toISOString();
    fields.resolved_by_email = user.email;
  }

  const { data: updated, error } = await supabase.from('flags').update(fields).eq('id', flagId).select().single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: flag.assetco_id,
    action: 'FLAG_STATUS_CHANGED',
    entityType: flag.entity_type,
    entityId: flag.entity_id || flag.id,
    details: { flagId, fromStatus: flag.status, toStatus: status },
  });

  if (status === 'resolved') {
    const recipientEmails = await recipientEmailsForFlag(user.email);
    await notificationService.notify({
      type: 'flag_resolved',
      message: `${user.email} resolved "${flag.title}"`,
      flagId,
      createdByEmail: user.email,
      recipientEmails,
    });
  }

  return updated;
}

module.exports = { createFlag, listFlags, getFlag, recordView, addComment, updateStatus, FLAG_NOTIFICATION_ROLES };
