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
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, assetco_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Creates a Supabase Auth user (via the Admin API, using the secret-key
 * client) plus its corresponding row in `public.users`. If the `public.users`
 * insert fails after the auth user was created, the auth user is rolled back
 * — otherwise we'd end up with an orphaned auth account nobody can provision
 * against (the exact gap ENVIRONMENTS.md's old manual process could leave
 * behind).
 */
async function createUser({ email, role, assetcoId, createdBy }) {
  if (!email || !role) throw Object.assign(new Error('email and role are required'), { status: 400 });
  if (!ROLES.includes(role)) {
    throw Object.assign(new Error(`role must be one of: ${ROLES.join(', ')}`), { status: 400 });
  }
  if (role === 'assetco_admin' && !assetcoId) {
    throw Object.assign(new Error('assetcoId is required for role assetco_admin'), { status: 400 });
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

  await supabase.from('audit_log').insert({
    actor_type: 'user',
    actor_user_id: createdBy?.id || null,
    action: 'user_created',
    entity_type: 'user',
    entity_id: userRow.id,
    details: { email, role, assetco_id: userRow.assetco_id },
  });

  logger.info('User account created', { email, role, assetcoId: userRow.assetco_id, createdBy: createdBy?.email });

  return { user: userRow, tempPassword };
}

module.exports = { listUsers, createUser, ROLES, CEF_WIDE_ROLES };
