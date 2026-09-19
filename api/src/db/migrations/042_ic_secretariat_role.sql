-- IC Engagement Portal: an ic_secretariat identity for the people who run
-- the portal day to day but aren't necessarily committee decision-makers -
-- moderators/clerks/secretaries keeping document links current, scheduling
-- meetings and sending invites, chasing conditions to closure. Named after
-- the existing "Secretariat" concept already in the product
-- (/engagement/secretariat, icSecretariatController) rather than inventing
-- new vocabulary.
--
-- Gets IC access automatically (added to AUTO_IC_ROLES in code, both
-- api/src/utils/icAccess.js and dashboard/lib/icAccess.js) and, as a side
-- effect of that same list, inherits committee-roster management, decision
-- recording, and minutes-locking authority (icCommitteeService,
-- icVotingService, icMinutesService) - deliberate, since that's exactly a
-- secretariat/clerk's job, not a side effect to route around. Confined
-- away from /dashboard entirely, the same as board_member (real
-- enforcement is dashboard/middleware.js, driven off PIP_EXCLUDED_ROLES).
--
-- Deliberately NOT added to CEF_WIDE_ROLES: this role should only ever
-- reach IC data (gated by current_user_can_access_ic()), not the broader
-- AssetCo/financial tables CEF_WIDE_ROLES implies read/write access to.
--
-- No RLS policy changes needed, same reasoning as migration 033
-- (board_member): every IC table's RLS already gates on the generic
-- current_user_can_access_ic() function, which AUTO_IC_ROLES membership
-- already satisfies.

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('executive', 'management', 'finance', 'ops', 'it_admin', 'assetco_admin', 'assetco_dev', 'risk', 'board_member', 'ic_secretariat'));
