-- Credit Risk role: a CEF-internal role (same broad read access as
-- finance/ops/executive/management/it_admin) that can flag financial data
-- items for other roles' attention and comment on them. The flagging/
-- comment tables and their own RLS live in a later migration
-- (021_notifications.sql) — this migration only adds the role itself so it
-- exists before anything references it.

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('executive', 'management', 'finance', 'ops', 'it_admin', 'assetco_admin', 'assetco_dev', 'risk'));

drop policy if exists "cef_wide_read_audit_log" on audit_log;
create policy "cef_wide_read_audit_log" on audit_log for select using (
  public.current_user_role() in ('executive', 'management', 'finance', 'ops', 'it_admin', 'risk')
);

drop policy if exists "cef_wide_read_user_assetco_dev_access" on user_assetco_dev_access;
create policy "cef_wide_read_user_assetco_dev_access" on user_assetco_dev_access for select using (
  public.current_user_role() in ('executive', 'management', 'finance', 'ops', 'it_admin', 'risk')
);

drop policy if exists "cef_wide_read_users" on users;
create policy "cef_wide_read_users" on users for select using (
  public.current_user_role() in ('executive', 'management', 'finance', 'ops', 'it_admin', 'risk')
);

-- is_cef_user() (migration 002, tightened in 019) is NOT role-restricted —
-- it's true for any active provisioned user, and gates series/dreef/
-- facilities/applications/pipeline tables that a risk user should read too.
-- Nothing to change there; risk falls under it automatically. The 016
-- role-scoped policies (customers/assets/events/... and assetcos) also fall
-- through to is_cef_user() in their `else` branch for any non-assetco role,
-- so risk is covered there as well without changes.
