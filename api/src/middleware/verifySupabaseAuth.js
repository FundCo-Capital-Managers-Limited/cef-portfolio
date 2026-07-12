const supabase = require('../config/supabase');
const { verifyAccessToken } = require('../services/jwtVerifier');

/**
 * Authenticates dashboard-originated requests (manual entry, facility
 * management, stage advancement, etc.) via a Supabase session JWT — distinct
 * from verifyHmac, which authenticates AssetCo webhook events. Attaches
 * req.user = { id, authUserId, email, role, assetcoId } on success, where id
 * is the row id in public.users (not the Supabase auth user id).
 */
async function verifySupabaseAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const payload = await verifyAccessToken(token);

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, role, assetco_id, is_active')
      .eq('auth_user_id', payload.sub)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      return res.status(403).json({ error: 'User is not provisioned on CEF-PIP' });
    }
    // Suspending a user bans them in Supabase Auth too (see userService.setUserActive),
    // but that doesn't retroactively invalidate an already-issued JWT before it
    // expires — checking is_active here closes that window immediately instead
    // of waiting out the token's remaining lifetime.
    if (profile.is_active === false) {
      return res.status(403).json({ error: 'This account has been suspended' });
    }

    let assetcoIds;
    if (profile.role === 'assetco_dev') {
      const { data: access, error: accessError } = await supabase
        .from('user_assetco_dev_access')
        .select('assetco_id')
        .eq('user_id', profile.id);
      if (accessError) throw accessError;
      assetcoIds = (access || []).map((a) => a.assetco_id);
    }

    req.user = {
      id: profile.id,
      authUserId: payload.sub,
      email: profile.email,
      role: profile.role,
      assetcoId: profile.assetco_id,
      assetcoIds,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = verifySupabaseAuth;
