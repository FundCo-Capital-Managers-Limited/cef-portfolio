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

const CEF_WIDE_ROLES = ['executive', 'management', 'finance', 'ops', 'it_admin', 'risk'];

/**
 * True if the user can act on the given AssetCo: any CEF-wide role can act on
 * every AssetCo; an assetco_admin only on the one they're scoped to.
 */
function canAccessAssetco(user, assetCoId) {
  if (CEF_WIDE_ROLES.includes(user.role)) return true;
  if (user.role === 'assetco_admin') return user.assetcoId === assetCoId;
  if (user.role === 'assetco_dev') return (user.assetcoIds || []).includes(assetCoId);
  return false;
}

/**
 * True if the user can WRITE data for the given AssetCo: management/it_admin/
 * finance/risk for any AssetCo, or the AssetCo's own assetco_admin. Narrower
 * than canAccessAssetco (which also lets ops/executive read) — used for
 * manual entry, facility/loan-book records, InfraCredit/DREEF data, customer
 * status changes, and other mutating endpoints. finance/risk were added here
 * so they can actually enter/adjust financial data (facility disbursements,
 * manually-recorded payments) rather than only reading it.
 */
function canManageAssetco(user, assetCoId) {
  if (['management', 'it_admin', 'finance', 'risk'].includes(user.role)) return true;
  return user.role === 'assetco_admin' && user.assetcoId === assetCoId;
}

/**
 * Gates a route to the IC Engagement portal — req.user.canAccessIc is set by
 * verifySupabaseAuth from users.can_access_ic (or an auto-access role; see
 * ../utils/icAccess.js). Separate from requireRole since IC access isn't a
 * role, it's a capability that can sit on top of any existing role.
 */
function requireIcAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!req.user.canAccessIc) {
    return res.status(403).json({ error: 'No access to the IC Engagement portal' });
  }
  next();
}

module.exports = { requireRole, canAccessAssetco, canManageAssetco, requireIcAccess, CEF_WIDE_ROLES };
