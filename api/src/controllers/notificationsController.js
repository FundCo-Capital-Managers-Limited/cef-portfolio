const supabase = require('../config/supabase');

async function getCursor(userId) {
  const { data, error } = await supabase
    .from('notification_cursors')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  // First-ever check for this user: bootstrap the cursor at "now" rather than
  // surfacing the platform's entire history as unread.
  const now = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from('notification_cursors')
    .upsert({ user_id: userId, last_seen_at: now }, { onConflict: 'user_id' });
  if (upsertError) throw upsertError;
  return { user_id: userId, last_seen_at: now };
}

async function getUnreadCount(req, res, next) {
  try {
    const cursor = await getCursor(req.user.id);
    const { data, error } = await supabase
      .from('audit_log')
      .select('id')
      .gte('created_at', cursor.last_seen_at);
    if (error) throw error;

    res.status(200).json({ unreadCount: (data || []).length, lastSeenAt: cursor.last_seen_at });
  } catch (err) {
    next(err);
  }
}

async function getRecent(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    res.status(200).json({ items: data || [] });
  } catch (err) {
    next(err);
  }
}

async function markSeen(req, res, next) {
  try {
    const { error } = await supabase
      .from('notification_cursors')
      .upsert({ user_id: req.user.id, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUnreadCount, getRecent, markSeen };
