const supabase = require('../config/supabase');

/**
 * Creates a notification and fans it out to one recipient row per user in
 * `recipientEmails` (each gets their own read_at, independent of the others
 * — see migration 021's comment for why this is a separate mechanism from
 * the audit_log-cursor bell). Callers pass emails, not roles, because the
 * caller has already decided who should be notified (and excluded, e.g. the
 * actor themselves) — this function just persists and delivers.
 */
async function notify({ type, message, flagId, createdByEmail, recipientEmails }) {
  const targets = [...new Set(recipientEmails.filter(Boolean))];
  if (!targets.length) return null;

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .in('email', targets);
  if (usersError) throw usersError;

  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .insert({ type, message, flag_id: flagId || null, created_by_email: createdByEmail || null })
    .select()
    .single();
  if (notificationError) throw notificationError;

  const recipientRows = (users || []).map((u) => ({ notification_id: notification.id, user_id: u.id }));
  if (recipientRows.length) {
    const { error: recipientsError } = await supabase.from('notification_recipients').insert(recipientRows);
    if (recipientsError) throw recipientsError;
  }

  return notification;
}

async function listForUser(userId) {
  const { data: recipientRows, error: recipientError } = await supabase
    .from('notification_recipients')
    .select('*')
    .eq('user_id', userId);
  if (recipientError) throw recipientError;

  const byNotificationId = new Map((recipientRows || []).map((r) => [r.notification_id, r]));
  const ids = [...byNotificationId.keys()];
  if (!ids.length) return [];

  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (notificationsError) throw notificationsError;

  return (notifications || []).map((n) => ({ ...n, read_at: byNotificationId.get(n.id)?.read_at || null }));
}

async function unreadCount(userId) {
  const items = await listForUser(userId);
  return items.filter((n) => !n.read_at).length;
}

async function markRead(notificationId, userId) {
  const { error } = await supabase
    .from('notification_recipients')
    .update({ read_at: new Date().toISOString() })
    .eq('notification_id', notificationId)
    .eq('user_id', userId);
  if (error) throw error;
}

module.exports = { notify, listForUser, unreadCount, markRead };
