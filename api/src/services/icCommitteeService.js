const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const { AUTO_IC_ROLES } = require('../utils/icAccess');

// Roster edits are narrower than general IC access: management/executive/
// it_admin always can, and so can whoever is currently the active Secretary -
// a designated responsibility on the roster itself, not a fixed role, per
// how the team actually wants this run.
async function canManageRoster(user) {
  if (AUTO_IC_ROLES.includes(user.role)) return true;
  const { data, error } = await supabase
    .from('ic_committee_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_secretary', true)
    .is('removed_at', null)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function assertCanManageRoster(user) {
  if (!(await canManageRoster(user))) {
    throw Object.assign(new Error('Only management, executive, IT Admin, or the IC Secretary can modify the committee roster'), { status: 403 });
  }
}

// A plain /api/users lookup is locked to it_admin/management, which would
// block a non-auto-role Secretary from picking who to add to the roster -
// this is deliberately narrower (id/email/name/role only, no is_active/
// assetco_id/etc.) and gated by requireIcAccess rather than requireRole.
async function listCandidateUsers() {
  const { data, error } = await supabase.from('users').select('id, email, name, role').eq('is_active', true).order('email', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function listActiveMembers() {
  const { data: members, error } = await supabase
    .from('ic_committee_members')
    .select('*')
    .is('removed_at', null)
    .order('added_at', { ascending: true });
  if (error) throw error;

  const userIds = [...new Set((members || []).map((m) => m.user_id))];
  let userById = new Map();
  if (userIds.length) {
    const { data: users, error: usersError } = await supabase.from('users').select('id, email, name, role').in('id', userIds);
    if (usersError) throw usersError;
    userById = new Map((users || []).map((u) => [u.id, u]));
  }

  return (members || []).map((m) => ({ ...m, user: userById.get(m.user_id) || null }));
}

async function addMember({ userId, isChair, isSecretary }, actor) {
  await assertCanManageRoster(actor);
  if (!userId) throw Object.assign(new Error('userId is required'), { status: 400 });

  const { data: existing, error: existingError } = await supabase
    .from('ic_committee_members')
    .select('id')
    .eq('user_id', userId)
    .is('removed_at', null)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw Object.assign(new Error('That user is already an active committee member'), { status: 400 });

  const { data: member, error } = await supabase
    .from('ic_committee_members')
    .insert({
      user_id: userId,
      is_chair: Boolean(isChair),
      is_secretary: Boolean(isSecretary),
      added_by_email: actor.email,
    })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: 'IC_COMMITTEE_MEMBER_ADDED',
    entityType: 'ic_committee_member',
    entityId: member.id,
    details: { userId, isChair, isSecretary },
  });

  return member;
}

async function updateMember(memberId, { isChair, isSecretary }, actor) {
  await assertCanManageRoster(actor);

  const patch = {};
  if (isChair !== undefined) patch.is_chair = isChair;
  if (isSecretary !== undefined) patch.is_secretary = isSecretary;

  const { data: updated, error } = await supabase.from('ic_committee_members').update(patch).eq('id', memberId).select().single();
  if (error) throw error;
  if (!updated) throw Object.assign(new Error('Committee member not found'), { status: 404 });

  await recordAudit({
    actorType: 'user',
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: 'IC_COMMITTEE_MEMBER_UPDATED',
    entityType: 'ic_committee_member',
    entityId: memberId,
    details: { isChair, isSecretary },
  });

  return updated;
}

async function removeMember(memberId, actor) {
  await assertCanManageRoster(actor);

  const { data: updated, error } = await supabase
    .from('ic_committee_members')
    .update({ removed_at: new Date().toISOString(), removed_by_email: actor.email })
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw error;
  if (!updated) throw Object.assign(new Error('Committee member not found'), { status: 404 });

  await recordAudit({
    actorType: 'user',
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: 'IC_COMMITTEE_MEMBER_REMOVED',
    entityType: 'ic_committee_member',
    entityId: memberId,
    details: {},
  });

  return updated;
}

module.exports = { canManageRoster, listCandidateUsers, listActiveMembers, addMember, updateMember, removeMember };
