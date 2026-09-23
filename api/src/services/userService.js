const crypto = require('crypto');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { ROLES, CEF_WIDE_ROLES } = require('../utils/userEnums');
const { sendWelcomeEmail, sendPasswordResetCredentialsEmail } = require('./welcomeEmailService');

function generateTempPassword() {
  // 16 random bytes as base64url — meets Supabase's password requirements and
  // is never reused, since the account creator hands it to the new user once
  // and the recipient is expected to change it on first login.
  return crypto.randomBytes(16).toString('base64url');
}

async function listUsers() {
  const [{ data, error }, { data: devAccess, error: devAccessError }] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, name, role, assetco_id, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('user_assetco_dev_access').select('user_id, assetco_id'),
  ]);
  if (error) throw error;
  if (devAccessError) throw devAccessError;

  const accessByUser = new Map();
  for (const row of devAccess || []) {
    if (!accessByUser.has(row.user_id)) accessByUser.set(row.user_id, []);
    accessByUser.get(row.user_id).push(row.assetco_id);
  }

  return (data || []).map((u) => ({ ...u, assetco_ids: accessByUser.get(u.id) || [] }));
}

/**
 * Creates a Supabase Auth user (via the Admin API, using the secret-key
 * client) plus its corresponding row in `public.users`. If the `public.users`
 * insert fails after the auth user was created, the auth user is rolled back
 * — otherwise we'd end up with an orphaned auth account nobody can provision
 * against (the exact gap ENVIRONMENTS.md's old manual process could leave
 * behind).
 */
async function createUser({ email, name, role, assetcoId, assetcoIds, canAccessIc, createdBy }) {
  if (!email || !role) throw Object.assign(new Error('email and role are required'), { status: 400 });
  if (!ROLES.includes(role)) {
    throw Object.assign(new Error(`role must be one of: ${ROLES.join(', ')}`), { status: 400 });
  }
  if (role === 'assetco_admin' && !assetcoId) {
    throw Object.assign(new Error('assetcoId is required for role assetco_admin'), { status: 400 });
  }
  if (role === 'assetco_dev' && !assetcoIds?.length) {
    throw Object.assign(new Error('assetcoIds (at least one) is required for role assetco_dev'), { status: 400 });
  }

  const tempPassword = generateTempPassword();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError) throw Object.assign(new Error(authError.message), { status: 400 });

  const { data: userRow, error: insertError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      email,
      name: name || null,
      role,
      assetco_id: role === 'assetco_admin' ? assetcoId : null,
      can_access_ic: Boolean(canAccessIc),
    })
    .select()
    .single();

  if (insertError) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch((cleanupErr) => {
      logger.error('Failed to roll back orphaned auth user after users insert failure', {
        authUserId: authData.user.id,
        error: cleanupErr.message,
      });
    });
    throw insertError;
  }

  if (role === 'assetco_dev') {
    const { error: accessError } = await supabase
      .from('user_assetco_dev_access')
      .insert(assetcoIds.map((id) => ({ user_id: userRow.id, assetco_id: id })));
    if (accessError) throw accessError;
  }

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: createdBy?.id || null,
    actor_email: createdBy?.email || null,
    action: 'user_created',
    entity_type: 'user',
    entity_id: userRow.id,
    details: { email, role, assetco_id: userRow.assetco_id, assetco_ids: role === 'assetco_dev' ? assetcoIds : undefined },
  });

  logger.info('User account created', { email, role, assetcoId: userRow.assetco_id, assetcoIds, createdBy: createdBy?.email });

  // Fire-and-forget: a failed send must never fail account creation — the
  // temp password is already returned below either way, which is what the
  // admin UI falls back to showing on screen (see welcomeEmailService.js).
  await sendWelcomeEmail({ email, role, tempPassword });

  return { user: { ...userRow, assetco_ids: role === 'assetco_dev' ? assetcoIds : undefined }, tempPassword };
}

/**
 * Admin-triggered reset: generates a fresh temporary password and sets it
 * directly via the Admin API, showing it once on screen (same flow
 * createUser already uses) rather than emailing it automatically — the
 * admin decides afterward whether to hand it over in person or click "Send
 * to user" (sendUserCredentialsEmail, below) to email it instead.
 */
async function resetUserPassword(userId, resetBy) {
  const { data: userRow, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!userRow) throw Object.assign(new Error('User not found'), { status: 404 });

  const tempPassword = generateTempPassword();
  const { error: authError } = await supabase.auth.admin.updateUserById(userRow.auth_user_id, {
    password: tempPassword,
  });
  if (authError) throw Object.assign(new Error(authError.message), { status: 400 });

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: resetBy?.id || null,
    actor_email: resetBy?.email || null,
    action: 'user_password_reset',
    entity_type: 'user',
    entity_id: userRow.id,
    details: { email: userRow.email },
  });

  logger.info('User password reset by admin', { email: userRow.email, resetBy: resetBy?.email });

  return { user: userRow, tempPassword };
}

/**
 * The "Send to user" follow-up action next to Reset Password in the admin
 * panel. The temp password itself is never stored anywhere (resetUserPassword
 * only ever returns it once, by design) — the admin's browser already has it
 * in state from the reset response, and hands it back here rather than the
 * server regenerating or looking it up. The caller (it_admin/management) can
 * already set this user's password directly via resetUserPassword, so
 * trusting the temp password they supply here doesn't cross any new
 * privilege boundary.
 */
async function sendUserCredentialsEmail(userId, tempPassword, actor) {
  if (!tempPassword || typeof tempPassword !== 'string' || tempPassword.length < 8) {
    throw Object.assign(new Error('A valid tempPassword is required'), { status: 400 });
  }

  const { data: userRow, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!userRow) throw Object.assign(new Error('User not found'), { status: 404 });

  await sendPasswordResetCredentialsEmail({ email: userRow.email, tempPassword });

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: actor?.id || null,
    actor_email: actor?.email || null,
    action: 'user_credentials_emailed',
    entity_type: 'user',
    entity_id: userRow.id,
    details: { email: userRow.email },
  });

  logger.info('User credentials emailed', { email: userRow.email, actor: actor?.email });
}

/**
 * Self-service password change for a logged-in user who still knows their
 * current password (distinct from resetUserPassword/forgot-password, both
 * of which exist precisely for when they don't). Re-verifies the current
 * password via a real sign-in attempt rather than trusting the caller's
 * existing session alone — a session left open on a shared machine
 * shouldn't be enough by itself to silently take over the account's
 * credentials. Note: this does mint a throwaway Supabase Auth session as a
 * side effect of the verification sign-in, which is never used or revoked —
 * harmless (it just expires on its own), but worth knowing if session count
 * is ever audited.
 */
async function changeOwnPassword(actor, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw Object.assign(new Error('currentPassword and newPassword are required'), { status: 400 });
  }
  if (newPassword.length < 8) {
    throw Object.assign(new Error('New password must be at least 8 characters'), { status: 400 });
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: actor.email,
    password: currentPassword,
  });
  if (signInError) {
    throw Object.assign(new Error('Current password is incorrect'), { status: 401 });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(actor.authUserId, {
    password: newPassword,
  });
  if (updateError) throw Object.assign(new Error(updateError.message), { status: 400 });

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: actor.id,
    actor_email: actor.email,
    action: 'user_password_changed_self',
    entity_type: 'user',
    entity_id: actor.id,
    details: {},
  });

  logger.info('User changed their own password', { email: actor.email });
}

/**
 * Suspend/unsuspend: sets is_active on public.users (drives the UI/audit
 * trail) and actually blocks/unblocks sign-in via Supabase Auth's ban
 * mechanism — flipping is_active alone would leave an existing session or a
 * password-based login still working, since RLS/role checks read from
 * public.users but Supabase Auth itself doesn't know about that flag.
 */
async function setUserActive(userId, isActive, actor) {
  const { data: userRow, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!userRow) throw Object.assign(new Error('User not found'), { status: 404 });

  const { error: authError } = await supabase.auth.admin.updateUserById(userRow.auth_user_id, {
    ban_duration: isActive ? 'none' : '876000h', // ~100 years — effectively indefinite until unsuspended
  });
  if (authError) throw Object.assign(new Error(authError.message), { status: 400 });

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select()
    .single();
  if (updateError) throw updateError;

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: actor?.id || null,
    actor_email: actor?.email || null,
    action: isActive ? 'user_reactivated' : 'user_suspended',
    entity_type: 'user',
    entity_id: userId,
    details: { email: userRow.email },
  });

  logger.info(isActive ? 'User reactivated' : 'User suspended', { email: userRow.email, actor: actor?.email });

  return updated;
}

/**
 * Edits an existing user's name, role, and role-specific AssetCo assignment
 * (assetco_id for assetco_admin, the user_assetco_dev_access rows for
 * assetco_dev). Changing role away from assetco_admin/assetco_dev clears
 * whichever assignment no longer applies, so a stale assetco_id/access row
 * can't linger and silently scope a different role's RLS access.
 */
async function updateUser(userId, { name, role, assetcoId, assetcoIds }, actor) {
  const { data: userRow, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!userRow) throw Object.assign(new Error('User not found'), { status: 404 });

  if (role !== undefined && !ROLES.includes(role)) {
    throw Object.assign(new Error(`role must be one of: ${ROLES.join(', ')}`), { status: 400 });
  }
  const nextRole = role !== undefined ? role : userRow.role;
  if (nextRole === 'assetco_admin' && !(assetcoId !== undefined ? assetcoId : userRow.assetco_id)) {
    throw Object.assign(new Error('assetcoId is required for role assetco_admin'), { status: 400 });
  }
  if (nextRole === 'assetco_dev' && role !== undefined && !assetcoIds?.length) {
    throw Object.assign(new Error('assetcoIds (at least one) is required when changing role to assetco_dev'), { status: 400 });
  }

  const fields = {};
  if (name !== undefined) fields.name = name || null;
  if (role !== undefined) fields.role = role;
  fields.assetco_id = nextRole === 'assetco_admin' ? (assetcoId !== undefined ? assetcoId : userRow.assetco_id) : null;

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update(fields)
    .eq('id', userId)
    .select()
    .single();
  if (updateError) throw updateError;

  if (nextRole === 'assetco_dev' && assetcoIds !== undefined) {
    const { error: deleteAccessError } = await supabase.from('user_assetco_dev_access').delete().eq('user_id', userId);
    if (deleteAccessError) throw deleteAccessError;
    if (assetcoIds.length) {
      const { error: insertAccessError } = await supabase
        .from('user_assetco_dev_access')
        .insert(assetcoIds.map((id) => ({ user_id: userId, assetco_id: id })));
      if (insertAccessError) throw insertAccessError;
    }
  } else if (nextRole !== 'assetco_dev') {
    // Role changed away from assetco_dev — don't leave old access grants
    // pointing at a role that no longer uses them.
    await supabase.from('user_assetco_dev_access').delete().eq('user_id', userId);
  }

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: actor?.id || null,
    actor_email: actor?.email || null,
    action: 'user_updated',
    entity_type: 'user',
    entity_id: userId,
    details: { email: userRow.email, changes: { name, role, assetcoId, assetcoIds } },
  });

  logger.info('User updated', { email: userRow.email, actor: actor?.email });

  return { ...updated, assetco_ids: nextRole === 'assetco_dev' ? (assetcoIds !== undefined ? assetcoIds : undefined) : undefined };
}

/**
 * Hard delete: removes both the public.users row and the underlying
 * Supabase Auth account. Every FK from historical/audit tables (audit_log,
 * flags, matters, documents, meetings, facility records, ...) is `on delete
 * set null` (see migration 044 and the ones it lists as prior art, e.g.
 * 018/021/022) — each of those tables also carries a denormalized
 * `*_email`/`*_by_email` column, so nulling the user reference loses no
 * history. The one thing that still hard-blocks deletion, deliberately, is
 * committee/vote history (ic_committee_members, ic_conflict_declarations,
 * ic_votes) — see the FK_HISTORY_ERROR handling below.
 */
async function deleteUser(userId, actor) {
  const { data: userRow, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!userRow) throw Object.assign(new Error('User not found'), { status: 404 });

  if (userRow.id === actor?.id) {
    throw Object.assign(new Error('You cannot delete your own account'), { status: 400 });
  }

  const { error: deleteError } = await supabase.from('users').delete().eq('id', userId);
  if (deleteError) {
    // Postgres foreign_key_violation. The only FKs still on the default
    // RESTRICT behavior after migration 044 are ic_committee_members.user_id,
    // ic_conflict_declarations.user_id, and ic_votes.user_id — real
    // committee/voting history with no denormalized email fallback, so it
    // must not be silently nulled or cascaded away. Surface that as an
    // actionable message instead of the raw Postgres constraint error.
    if (deleteError.code === '23503') {
      throw Object.assign(
        new Error('This user has IC committee or voting history and cannot be deleted. Suspend the account instead.'),
        { status: 409 }
      );
    }
    throw deleteError;
  }

  await supabase.auth.admin.deleteUser(userRow.auth_user_id).catch((err) => {
    logger.error('Failed to delete Supabase Auth account after users row was removed', {
      email: userRow.email,
      error: err.message,
    });
  });

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: actor?.id || null,
    actor_email: actor?.email || null,
    action: 'user_deleted',
    entity_type: 'user',
    entity_id: userId,
    details: { email: userRow.email, role: userRow.role },
  });

  logger.info('User deleted', { email: userRow.email, actor: actor?.email });
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  sendUserCredentialsEmail,
  changeOwnPassword,
  setUserActive,
  deleteUser,
  ROLES,
  CEF_WIDE_ROLES,
};
