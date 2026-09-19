-- Fix: current_user_can_access_ic() (defined in 024_ic_matters.sql) still
-- only auto-grants role in ('management', 'executive', 'it_admin') at the
-- database/RLS level. board_member (033) and ic_secretariat (042) were
-- added to AUTO_IC_ROLES in app code (api/src/utils/icAccess.js and
-- dashboard/lib/icAccess.js) but this SQL function was never updated to
-- match, so a board_member/ic_secretariat user with can_access_ic=false
-- would fail RLS on every ic_* table if anything ever queried them with
-- the caller's own token instead of the API's service-role key.
--
-- Currently inert in practice — the dashboard never queries ic_* tables
-- directly (grep confirms no `supabase.from('ic_...')` in dashboard/), so
-- every IC read/write goes through the Express API using
-- SUPABASE_SECRET_KEY, which bypasses RLS entirely. This closes the gap
-- as defense-in-depth anyway, so a future code path that does query
-- ic_* tables with the user's own session doesn't inherit a stale list.
--
-- Keep this in sync with AUTO_IC_ROLES in both icAccess.js copies by hand,
-- same as those two files are kept in sync with each other — there's no
-- single source of truth for "which roles get automatic IC access" across
-- app code and the database, so a future new auto-IC role needs updating
-- in three places: dashboard/lib/icAccess.js, api/src/utils/icAccess.js,
-- and this function.

create or replace function public.current_user_can_access_ic()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = auth.uid()
      and is_active
      and (role in ('management', 'executive', 'it_admin', 'board_member', 'ic_secretariat') or can_access_ic)
  );
$$;
