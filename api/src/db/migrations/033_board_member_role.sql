-- IC Engagement Portal: a Board Committee Member identity that gets IC
-- access automatically (added to the AUTO_IC_ROLES list in code, both
-- api/src/utils/icAccess.js and dashboard/lib/icAccess.js) but is actively
-- confined away from /dashboard entirely - the mirror image of assetco_dev's
-- confinement to the Developer Console. Real enforcement is in
-- dashboard/middleware.js, same "hiding nav links isn't the boundary"
-- principle already established for assetco_dev.
--
-- Deliberately NOT added to CEF_WIDE_ROLES: a board member should only ever
-- reach IC data (gated by current_user_can_access_ic()), not the broader
-- AssetCo/financial tables CEF_WIDE_ROLES implies read/write access to.

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('executive', 'management', 'finance', 'ops', 'it_admin', 'assetco_admin', 'assetco_dev', 'risk', 'board_member'));
