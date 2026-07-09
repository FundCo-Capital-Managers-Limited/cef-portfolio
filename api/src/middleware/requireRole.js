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

/**
 * True if the user can WRITE data for the given AssetCo: management/it_admin
 * for any AssetCo, or the AssetCo's own assetco_admin. Narrower than
 * canAccessAssetco (which also lets finance/ops/executive read) — used for
 * manual entry, customer status changes, and other mutating endpoints where
 * the spec restricts write access to "CEF_MANAGEMENT, ASSETCO_ADMIN (own
 * AssetCo only)".
 */
function canManageAssetco(user, assetCoId) {
  if (['management', 'it_admin'].includes(user.role)) return true;
  return user.role === 'assetco_admin' && user.assetcoId === assetCoId;
}

module.exports = { requireRole, canAccessAssetco, canManageAssetco, CEF_WIDE_ROLES };
