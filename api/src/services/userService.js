const crypto = require('crypto');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { ROLES, CEF_WIDE_ROLES } = require('../utils/userEnums');

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
async function createUser({ email, name, role, assetcoId, assetcoIds, createdBy }) {
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

  return { user: { ...userRow, assetco_ids: role === 'assetco_dev' ? assetcoIds : undefined }, tempPassword };
}

/**
 * Admin-triggered reset: generates a fresh temporary password and sets it
 * directly via the Admin API, rather than emailing a reset link — this repo
 * has no auth-email templates configured yet, and it mirrors the same
 * "show it once on screen" flow createUser already uses, so admins have one
 * consistent way to hand a user working credentials.
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
 * Hard delete: removes both the public.users row and the underlying
 * Supabase Auth account. audit_log.actor_user_id is ON DELETE SET NULL (see
 * migration 018) and audit_log.actor_email is denormalized, so history
 * referencing this user survives — only the live account goes away.
 */
async function deleteUser(userId, actor) {
  const { data: userRow, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!userRow) throw Object.assign(new Error('User not found'), { status: 404 });

  if (userRow.id === actor?.id) {
    throw Object.assign(new Error('You cannot delete your own account'), { status: 400 });
  }

  const { error: deleteError } = await supabase.from('users').delete().eq('id', userId);
  if (deleteError) throw deleteError;

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
  resetUserPassword,
  setUserActive,
  deleteUser,
  ROLES,
  CEF_WIDE_ROLES,
};
