// Mirrors api/src/middleware/requireRole.js's canManageAssetco — kept in sync
// manually since the dashboard and api are separate packages in this monorepo.
// Used only to decide what to render (show/hide the Add Data button); the
// Express API re-enforces this on every write, so this is not a security
// boundary by itself.
export function canManageAssetco(profile, assetCoId) {
  if (!profile) return false;
  if (['management', 'it_admin', 'finance', 'risk'].includes(profile.role)) return true;
  return profile.role === 'assetco_admin' && profile.assetco_id === assetCoId;
}
