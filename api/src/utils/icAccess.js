// Mirrors dashboard/lib/icAccess.js — management/executive/it_admin/
// board_member get the IC Engagement portal automatically, anyone else
// needs can_access_ic set. Kept in sync manually (one's a CommonJS module
// for Express, the other an ES module for Next.js) since this repo doesn't
// share a package between them.
const AUTO_IC_ROLES = ['management', 'executive', 'it_admin', 'board_member'];

function canAccessIc(profile) {
  if (!profile) return false;
  return AUTO_IC_ROLES.includes(profile.role) || Boolean(profile.can_access_ic);
}

module.exports = { canAccessIc, AUTO_IC_ROLES };
