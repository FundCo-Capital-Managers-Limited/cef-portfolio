const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// The team reuses the same Teams link meeting to meeting - pre-filling from
// whatever was used last saves re-typing it every time, without forcing it
// to be identical (the field stays freely editable per meeting).
async function getDefaultTeamsLink() {
  const { data, error } = await supabase
    .from('ic_meetings')
    .select('teams_link')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.teams_link || null;
}

async function createMeeting({ meetingDate, teamsLink, chairUserId, secretaryUserId }, user) {
  if (!meetingDate) throw Object.assign(new Error('meetingDate is required'), { status: 400 });

  const { data: meeting, error } = await supabase
    .from('ic_meetings')
    .insert({
      meeting_date: meetingDate,
      teams_link: teamsLink || null,
      status: 'SCHEDULED',
      chair_user_id: chairUserId || null,
      secretary_user_id: secretaryUserId || null,
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
    action: 'IC_MEETING_CREATED',
    entityType: 'ic_meeting',
    entityId: meeting.id,
    details: { meetingDate },
  });

  return meeting;
}

async function listMeetings() {
  const { data, error } = await supabase.from('ic_meetings').select('*').order('meeting_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getMeeting(meetingId) {
  const { data: meeting, error } = await supabase.from('ic_meetings').select('*').eq('id', meetingId).maybeSingle();
  if (error) throw error;
  if (!meeting) throw Object.assign(new Error('Meeting not found'), { status: 404 });

  const { data: agendaItems, error: agendaError } = await supabase
    .from('ic_agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('sequence', { ascending: true });
  if (agendaError) throw agendaError;

  const matterIds = [...new Set((agendaItems || []).map((a) => a.matter_id))];
  let matterById = new Map();
  if (matterIds.length) {
    const { data: matters, error: mattersError } = await supabase.from('ic_matters').select('*').in('id', matterIds);
    if (mattersError) throw mattersError;
    matterById = new Map((matters || []).map((m) => [m.id, m]));
  }

  return {
    ...meeting,
    agendaItems: (agendaItems || []).map((a) => ({ ...a, matter: matterById.get(a.matter_id) || null })),
  };
}

async function updateMeeting(meetingId, fields, user) {
  const { status, meetingDate, teamsLink, chairUserId, secretaryUserId } = fields;
  if (status !== undefined && !STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${STATUSES.join(', ')}`), { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase.from('ic_meetings').select('*').eq('id', meetingId).maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw Object.assign(new Error('Meeting not found'), { status: 404 });
  // Snapshotted before the update call — see icMatterService.updateMatter
  // for why (some clients, including the fake one in tests, return/mutate
  // the same row object in place).
  const previousStatus = existing.status;

  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (meetingDate !== undefined) patch.meeting_date = meetingDate;
  if (teamsLink !== undefined) patch.teams_link = teamsLink;
  if (chairUserId !== undefined) patch.chair_user_id = chairUserId;
  if (secretaryUserId !== undefined) patch.secretary_user_id = secretaryUserId;

  const { data: updated, error } = await supabase.from('ic_meetings').update(patch).eq('id', meetingId).select().single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_MEETING_UPDATED',
    entityType: 'ic_meeting',
    entityId: meetingId,
    details: { fromStatus: previousStatus, ...fields },
  });

  return updated;
}

async function addAgendaItem(meetingId, matterId, notes, user) {
  const { data: meeting, error: meetingError } = await supabase.from('ic_meetings').select('id').eq('id', meetingId).maybeSingle();
  if (meetingError) throw meetingError;
  if (!meeting) throw Object.assign(new Error('Meeting not found'), { status: 404 });

  const { data: matter, error: matterError } = await supabase.from('ic_matters').select('id').eq('id', matterId).maybeSingle();
  if (matterError) throw matterError;
  if (!matter) throw Object.assign(new Error('Matter not found'), { status: 404 });

  const { data: existingItems, error: existingItemsError } = await supabase
    .from('ic_agenda_items')
    .select('id, matter_id')
    .eq('meeting_id', meetingId);
  if (existingItemsError) throw existingItemsError;
  // Checked explicitly here rather than relying on the DB's unique(meeting_id,
  // matter_id) constraint erroring - the fake Supabase client used in tests
  // doesn't enforce real constraints, and a clean 400 here is a better
  // message than a raw constraint-violation error either way.
  if ((existingItems || []).some((item) => item.matter_id === matterId)) {
    throw Object.assign(new Error("That matter is already on this meeting's agenda"), { status: 400 });
  }

  const { data: item, error } = await supabase
    .from('ic_agenda_items')
    .insert({ meeting_id: meetingId, matter_id: matterId, sequence: existingItems.length, notes: notes || null })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_AGENDA_ITEM_ADDED',
    entityType: 'ic_meeting',
    entityId: meetingId,
    details: { matterId },
  });

  return item;
}

async function removeAgendaItem(meetingId, itemId, user) {
  const { error } = await supabase.from('ic_agenda_items').delete().eq('id', itemId).eq('meeting_id', meetingId);
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_AGENDA_ITEM_REMOVED',
    entityType: 'ic_meeting',
    entityId: meetingId,
    details: { itemId },
  });
}

module.exports = {
  getDefaultTeamsLink,
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  addAgendaItem,
  removeAgendaItem,
  STATUSES,
};
