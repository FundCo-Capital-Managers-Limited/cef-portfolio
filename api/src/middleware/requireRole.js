/**
 * Gates a route to specific roles. Must run after verifySupabaseAuth (needs
 * req.user). For endpoints where an assetco_admin may act on their own
 * AssetCo only, use canAccessAssetco alongside this rather than as a
 * replacement — role alone doesn't express the "own AssetCo" scoping.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role for this action' });
    }
    next();
  };
}

const CEF_WIDE_ROLES = ['executive', 'management', 'finance', 'ops', 'it_admin'];

/**
 * True if the user can act on the given AssetCo: any CEF-wide role can act on
 * every AssetCo; an assetco_admin only on the one they're scoped to.
 */
function canAccessAssetco(user, assetCoId) {
  if (CEF_WIDE_ROLES.includes(user.role)) return true;
  return user.role === 'assetco_admin' && user.assetcoId === assetCoId;
}

module.exports = { requireRole, canAccessAssetco, CEF_WIDE_ROLES };
