// management/executive/it_admin/board_member/ic_secretariat get the IC
// Engagement portal automatically; anyone else needs users.can_access_ic
// set explicitly. Kept as one function so the rule lives in exactly one
// place (middleware.js and the engagement layout both need it, and must
// never drift apart).
export const AUTO_IC_ROLES = ['management', 'executive', 'it_admin', 'board_member', 'ic_secretariat'];

export function canAccessIc(profile) {
  if (!profile) return false;
  return AUTO_IC_ROLES.includes(profile.role) || Boolean(profile.can_access_ic);
}

// board_member and ic_secretariat are the roles with no PIP dashboard
// access at all — every other role defaults to having it. ic_secretariat
// (moderators/clerks/secretaries running the IC portal — scheduling
// meetings, sending invites, keeping document links current) is scoped the
// same way board_member is: their whole job lives in /engagement, so they
// get no Portfolio dashboard access to begin with, rather than needing a
// separate deny-list. Mirrors assetco_dev's confinement to the Developer
// Console, just inverted (confined to /engagement instead of
// /dashboard/dev-console). Enforced in middleware.js, not just here — this
// only controls what links/UI get shown.
const PIP_EXCLUDED_ROLES = ['board_member', 'ic_secretariat'];

export function canAccessPip(profile) {
  if (!profile) return false;
  return !PIP_EXCLUDED_ROLES.includes(profile.role);
}
