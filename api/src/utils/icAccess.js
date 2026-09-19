// Mirrors dashboard/lib/icAccess.js — management/executive/it_admin/
// board_member/ic_secretariat get the IC Engagement portal automatically,
// anyone else needs can_access_ic set. Kept in sync manually (one's a
// CommonJS module for Express, the other an ES module for Next.js) since
// this repo doesn't share a package between them.
//
// ic_secretariat also inherits every AUTO_IC_ROLES-gated permission
// (icCommitteeService.canManageRoster, icVotingService.canRecordDecision,
// icMinutesService.canActOnMeeting) — deliberate, since running the
// roster/agenda, recording the committee's decision, and locking the
// minutes is exactly what a secretariat/clerk does, not a side effect to
// route around.
const AUTO_IC_ROLES = ['management', 'executive', 'it_admin', 'board_member', 'ic_secretariat'];

function canAccessIc(profile) {
  if (!profile) return false;
  return AUTO_IC_ROLES.includes(profile.role) || Boolean(profile.can_access_ic);
}

module.exports = { canAccessIc, AUTO_IC_ROLES };
