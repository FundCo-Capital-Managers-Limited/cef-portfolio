// management/executive/it_admin/board_member get the IC Engagement portal
// automatically; anyone else needs users.can_access_ic set explicitly. Kept
// as one function so the rule lives in exactly one place (middleware.js and
// the engagement layout both need it, and must never drift apart).
export const AUTO_IC_ROLES = ['management', 'executive', 'it_admin', 'board_member'];

export function canAccessIc(profile) {
  if (!profile) return false;
  return AUTO_IC_ROLES.includes(profile.role) || Boolean(profile.can_access_ic);
}

// board_member is the one role with no PIP dashboard access at all — every
// other role defaults to having it. Mirrors assetco_dev's confinement to
// the Developer Console, just inverted (confined to /engagement instead of
// /dashboard/dev-console). Enforced in middleware.js, not just here — this
// only controls what links/UI get shown.
const PIP_EXCLUDED_ROLES = ['board_member'];

export function canAccessPip(profile) {
  if (!profile) return false;
  return !PIP_EXCLUDED_ROLES.includes(profile.role);
}
