const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { AUTO_IC_ROLES } = require('../utils/icAccess');

const VOTE_VALUES = ['APPROVE', 'REJECT', 'ABSTAIN'];
const OUTCOMES = [
  'APPROVED', 'APPROVED_WITH_CONDITIONS', 'APPROVED_WITHIN_REVISED_PARAMETERS',
  'APPROVED_UNDER_DELEGATED_AUTHORITY', 'DEFERRED', 'RETURNED', 'DECLINED',
  'NOTED', 'RATIFIED', 'WITHDRAWN',
];

async function getActiveMemberIds() {
  const { data, error } = await supabase.from('ic_committee_members').select('user_id').is('removed_at', null);
  if (error) throw error;
  return (data || []).map((m) => m.user_id);
}

async function getRecusedUserIds(meetingId, matterId) {
  const { data, error } = await supabase
    .from('ic_conflict_declarations')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .eq('matter_id', matterId);
  if (error) throw error;
  return new Set((data || []).map((c) => c.user_id));
}

async function declareConflict(meetingId, matterId, reason, user) {
  const { data: existing, error: existingError } = await supabase
    .from('ic_conflict_declarations')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('matter_id', matterId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw Object.assign(new Error('A conflict has already been declared for this matter'), { status: 400 });

  const { data: declaration, error } = await supabase
    .from('ic_conflict_declarations')
    .insert({ meeting_id: meetingId, matter_id: matterId, user_id: user.id, reason: reason || null })
    .select()
    .single();
  if (error) throw error;

  // Declaring a conflict is treated as an automatic recusal — any vote this
  // member already cast on this matter is withdrawn rather than left
  // standing alongside a declared conflict.
  await supabase.from('ic_votes').delete().eq('meeting_id', meetingId).eq('matter_id', matterId).eq('user_id', user.id);

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_CONFLICT_DECLARED',
    entityType: 'ic_matter',
    entityId: matterId,
    details: { meetingId, reason },
  });

  return declaration;
}

async function listConflicts(meetingId, matterId) {
  const { data, error } = await supabase
    .from('ic_conflict_declarations')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('matter_id', matterId);
  if (error) throw error;
  return data || [];
}

async function castVote(meetingId, matterId, value, user) {
  if (!VOTE_VALUES.includes(value)) {
    throw Object.assign(new Error(`value must be one of: ${VOTE_VALUES.join(', ')}`), { status: 400 });
  }

  const [activeMemberIds, recusedUserIds] = await Promise.all([
    getActiveMemberIds(),
    getRecusedUserIds(meetingId, matterId),
  ]);
  if (!activeMemberIds.includes(user.id)) {
    throw Object.assign(new Error('Only active committee members can vote'), { status: 403 });
  }
  if (recusedUserIds.has(user.id)) {
    throw Object.assign(new Error('You have declared a conflict on this matter and cannot vote'), { status: 403 });
  }

  const { error } = await supabase
    .from('ic_votes')
    .upsert(
      { meeting_id: meetingId, matter_id: matterId, user_id: user.id, value, cast_at: new Date().toISOString() },
      { onConflict: 'meeting_id,matter_id,user_id' }
    );
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_VOTE_CAST',
    entityType: 'ic_matter',
    entityId: matterId,
    details: { meetingId, value },
  });

  return { meetingId, matterId, userId: user.id, value };
}

// Quorum is a simple majority of the full active roster who aren't recused
// on this specific matter - not just "a majority of whoever showed up",
// since Phase 1 doesn't track meeting attendance separately from roster
// membership yet (see PHASE_2_ROADMAP.md if that's ever wanted).
async function getVoteSummary(meetingId, matterId) {
  const [activeMemberIds, recusedUserIds, { data: votes, error: votesError }, { data: decision, error: decisionError }] = await Promise.all([
    getActiveMemberIds(),
    getRecusedUserIds(meetingId, matterId),
    supabase.from('ic_votes').select('*').eq('meeting_id', meetingId).eq('matter_id', matterId),
    supabase.from('ic_decisions').select('*').eq('meeting_id', meetingId).eq('matter_id', matterId).maybeSingle(),
  ]);
  if (votesError) throw votesError;
  if (decisionError) throw decisionError;

  const eligibleVoterIds = activeMemberIds.filter((id) => !recusedUserIds.has(id));
  const quorumRequired = Math.floor(activeMemberIds.length / 2) + 1;
  const votesFor = (votes || []).filter((v) => v.value === 'APPROVE').length;
  const votesAgainst = (votes || []).filter((v) => v.value === 'REJECT').length;
  const votesAbstain = (votes || []).filter((v) => v.value === 'ABSTAIN').length;

  return {
    activeMemberCount: activeMemberIds.length,
    recusedCount: recusedUserIds.size,
    eligibleVoterCount: eligibleVoterIds.length,
    votesCast: (votes || []).length,
    votesFor,
    votesAgainst,
    votesAbstain,
    quorumRequired,
    quorumMet: (votes || []).length >= quorumRequired,
    votes: votes || [],
    decision: decision || null,
  };
}

function canRecordDecision(user, meeting) {
  if (AUTO_IC_ROLES.includes(user.role)) return true;
  return user.id === meeting.chair_user_id || user.id === meeting.secretary_user_id;
}

async function recordDecision(meetingId, matterId, outcome, user) {
  if (!OUTCOMES.includes(outcome)) {
    throw Object.assign(new Error(`outcome must be one of: ${OUTCOMES.join(', ')}`), { status: 400 });
  }

  const { data: meeting, error: meetingError } = await supabase.from('ic_meetings').select('*').eq('id', meetingId).maybeSingle();
  if (meetingError) throw meetingError;
  if (!meeting) throw Object.assign(new Error('Meeting not found'), { status: 404 });
  if (!canRecordDecision(user, meeting)) {
    throw Object.assign(new Error('Only the meeting chair/secretary or management/executive/IT Admin can record a decision'), { status: 403 });
  }

  const { data: existingDecision, error: existingDecisionError } = await supabase
    .from('ic_decisions')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('matter_id', matterId)
    .maybeSingle();
  if (existingDecisionError) throw existingDecisionError;
  if (existingDecision) throw Object.assign(new Error('A decision has already been recorded for this matter at this meeting'), { status: 400 });

  const summary = await getVoteSummary(meetingId, matterId);

  const { data: decision, error } = await supabase
    .from('ic_decisions')
    .insert({
      meeting_id: meetingId,
      matter_id: matterId,
      outcome,
      quorum_met: summary.quorumMet,
      votes_for: summary.votesFor,
      votes_against: summary.votesAgainst,
      votes_abstain: summary.votesAbstain,
      decided_by_user_id: user.id,
      decided_by_email: user.email,
    })
    .select()
    .single();
  if (error) throw error;

  const nextMatterStatus = outcome === 'WITHDRAWN' ? 'WITHDRAWN' : 'DECIDED';
  const { error: matterUpdateError } = await supabase
    .from('ic_matters')
    .update({ status: nextMatterStatus, updated_at: new Date().toISOString() })
    .eq('id', matterId);
  if (matterUpdateError) throw matterUpdateError;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'IC_DECISION_RECORDED',
    entityType: 'ic_matter',
    entityId: matterId,
    details: { meetingId, outcome, quorumMet: summary.quorumMet },
  });

  return decision;
}

module.exports = {
  declareConflict,
  listConflicts,
  castVote,
  getVoteSummary,
  recordDecision,
  VOTE_VALUES,
  OUTCOMES,
};
