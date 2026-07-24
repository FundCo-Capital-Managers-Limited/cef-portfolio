// management/executive/it_admin get the IC Engagement portal automatically;
// anyone else needs users.can_access_ic set explicitly. Kept as one function
// so the rule lives in exactly one place (middleware.js and the engagement
// layout both need it, and must never drift apart).
export const AUTO_IC_ROLES = ['management', 'executive', 'it_admin'];

export function canAccessIc(profile) {
  if (!profile) return false;
  return AUTO_IC_ROLES.includes(profile.role) || Boolean(profile.can_access_ic);
}
