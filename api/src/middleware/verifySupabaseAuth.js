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
      .select('id, email, role, assetco_id')
      .eq('auth_user_id', payload.sub)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      return res.status(403).json({ error: 'User is not provisioned on CEF-PIP' });
    }

    req.user = {
      id: profile.id,
      authUserId: payload.sub,
      email: profile.email,
      role: profile.role,
      assetcoId: profile.assetco_id,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = verifySupabaseAuth;
