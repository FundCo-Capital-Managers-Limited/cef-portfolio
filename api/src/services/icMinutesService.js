const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { AUTO_IC_ROLES } = require('../utils/icAccess');

async function getMeeting(meetingId) {
  const { data: meeting, error } = await supabase.from('ic_meetings').select('*').eq('id', meetingId).maybeSingle();
  if (error) throw error;
  if (!meeting) throw Object.assign(new Error('Meeting not found'), { status: 404 });
  return meeting;
}

// Same authority as recording a decision (icVotingService.canRecordDecision)
// - the meeting's own chair/secretary, or management/executive/it_admin.
function canActOnMeeting(user, meeting) {
  if (AUTO_IC_ROLES.includes(user.role)) return true;
  return user.id === meeting.chair_user_id || user.id === meeting.secretary_user_id;
}

// Minutes are created lazily on first access rather than requiring a
// separate "create" step - there's nothing meaningful to configure at
// creation, unlike a matter or a condition.
async function getOrCreateMinutes(meetingId, user) {
  await getMeeting(meetingId);

  const { data: existing, error: existingError } = await supabase.from('ic_minutes').select('*').eq('meeting_id', meetingId).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('ic_minutes')
    .insert({ meeting_id: meetingId, content: '', status: 'DRAFT', drafted_by_user_id: user.id, drafted_by_email: user.email })
    .select()
    .single();
  if (error) throw error;
  return created;
}

async function updateMinutes(meetingId, { content, status }, user) {
  if (status !== undefined && !['DRAFT', 'UNDER_REVIEW'].includes(status)) {
    throw Object.assign(new Error('status must be DRAFT or UNDER_REVIEW here - use the lock action to finalize minutes'), { status: 400 });
  }

  const existing = await getOrCreateMinutes(meetingId, user);
  if (existing.status === 'LOCKED') {
    throw Object.assign(new Error('These minutes are locked and can no longer be edited'), { status: 400 });
  }

  const patch = { updated_at: new Date().toISOString() };
  if (content !== undefined) patch.content = content;
  if (status !== undefined) patch.status = status;

  const { data: updated, error } = await supabase.from('ic_minutes').update(patch).eq('meeting_id', meetingId).select().single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_MINUTES_UPDATED',
    entityType: 'ic_meeting',
    entityId: meetingId,
    details: { status },
  });

  return updated;
}

async function lockMinutes(meetingId, user) {
  const meeting = await getMeeting(meetingId);
  if (!canActOnMeeting(user, meeting)) {
    throw Object.assign(new Error('Only the meeting chair/secretary or management/executive/IT Admin can lock the minutes'), { status: 403 });
  }

  const existing = await getOrCreateMinutes(meetingId, user);
  if (existing.status === 'LOCKED') {
    throw Object.assign(new Error('These minutes are already locked'), { status: 400 });
  }

  const { data: locked, error } = await supabase
    .from('ic_minutes')
    .update({
      status: 'LOCKED',
      locked_by_user_id: user.id,
      locked_by_email: user.email,
      locked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('meeting_id', meetingId)
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_MINUTES_LOCKED',
    entityType: 'ic_meeting',
    entityId: meetingId,
    details: {},
  });

  return locked;
}

module.exports = { getOrCreateMinutes, updateMinutes, lockMinutes, canActOnMeeting };
