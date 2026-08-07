-- Closes a second RLS gap in the same family as migration 016: every table
-- added since (DREEF, CEF Series links, the Loan Book/Facility tables, Flags,
-- and the Credit Monitoring registers) kept the simpler is_cef_user()-broad
-- read policy, which is true for ANY provisioned user regardless of role.
-- migration 016 only role-scoped the tables that existed at the time.
--
-- The real, primary fix for the reported leak is dashboard/middleware.js
-- confining assetco_admin to /dashboard/[their own AssetCo]/* (assetco_admin
-- previously had no confinement at all, unlike assetco_dev/board_member).
-- This migration is defense-in-depth on top of that: without it, an
-- assetco_admin session could still read every other AssetCo's facilities,
-- series links, DREEF status, and flags via a direct Supabase query,
-- bypassing the app code's own .eq(assetco_id) filters entirely.
--
-- Policy names are hardcoded per table rather than derived from a formula —
-- an earlier draft assumed every existing policy was named
-- "cef_users_read_<table>", which is only true for some of these (e.g.
-- flags, facility_repayment_notifications) and not others (e.g.
-- cef_users_read_facilities on cef_facilities, cef_users_read_infracredit on
-- infracredit_relationships). A DROP POLICY IF EXISTS with the wrong name is
-- a silent no-op, not an error — it would have left the old is_cef_user()
-- policy in place alongside the new scoped one, and since Postgres RLS
-- policies are OR'd together (permissive by default), the broad old policy
-- would have kept granting full access regardless of the new one.

-- Tables keyed by a plain `assetco_id` column.
drop policy if exists "cef_users_read_infracredit" on infracredit_relationships;
create policy "role_scoped_read_infracredit_relationships" on infracredit_relationships for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_assetco_series" on assetco_series;
create policy "role_scoped_read_assetco_series" on assetco_series for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_facilities" on cef_facilities;
create policy "role_scoped_read_cef_facilities" on cef_facilities for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_facility_repayments" on cef_facility_repayments;
create policy "role_scoped_read_cef_facility_repayments" on cef_facility_repayments for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_flags" on flags;
create policy "role_scoped_read_flags" on flags for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_facility_repayment_notifications" on facility_repayment_notifications;
create policy "role_scoped_read_facility_repayment_notifications" on facility_repayment_notifications for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);

-- cef_facility_schedule/facility_documents/facility_security/facility_covenants
-- carry facility_id, not assetco_id directly — scope through a join to
-- cef_facilities.
drop policy if exists "cef_users_read_facility_schedule" on cef_facility_schedule;
create policy "role_scoped_read_cef_facility_schedule" on cef_facility_schedule for select using (
  case public.current_user_role()
    when 'assetco_admin' then exists (
      select 1 from cef_facilities f where f.id = cef_facility_schedule.facility_id and f.assetco_id = public.current_user_assetco_id()
    )
    when 'assetco_dev' then exists (
      select 1 from cef_facilities f where f.id = cef_facility_schedule.facility_id and f.assetco_id = any(public.current_user_dev_assetco_ids())
    )
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_facility_documents" on facility_documents;
create policy "role_scoped_read_facility_documents" on facility_documents for select using (
  case public.current_user_role()
    when 'assetco_admin' then exists (
      select 1 from cef_facilities f where f.id = facility_documents.facility_id and f.assetco_id = public.current_user_assetco_id()
    )
    when 'assetco_dev' then exists (
      select 1 from cef_facilities f where f.id = facility_documents.facility_id and f.assetco_id = any(public.current_user_dev_assetco_ids())
    )
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_facility_security" on facility_security;
create policy "role_scoped_read_facility_security" on facility_security for select using (
  case public.current_user_role()
    when 'assetco_admin' then exists (
      select 1 from cef_facilities f where f.id = facility_security.facility_id and f.assetco_id = public.current_user_assetco_id()
    )
    when 'assetco_dev' then exists (
      select 1 from cef_facilities f where f.id = facility_security.facility_id and f.assetco_id = any(public.current_user_dev_assetco_ids())
    )
    else public.is_cef_user()
  end
);

drop policy if exists "cef_users_read_facility_covenants" on facility_covenants;
create policy "role_scoped_read_facility_covenants" on facility_covenants for select using (
  case public.current_user_role()
    when 'assetco_admin' then exists (
      select 1 from cef_facilities f where f.id = facility_covenants.facility_id and f.assetco_id = public.current_user_assetco_id()
    )
    when 'assetco_dev' then exists (
      select 1 from cef_facilities f where f.id = facility_covenants.facility_id and f.assetco_id = any(public.current_user_dev_assetco_ids())
    )
    else public.is_cef_user()
  end
);

-- cef_series itself is not per-AssetCo (it's CEF's own funding rounds, shared
-- across the portfolio) — left on is_cef_user(), same as before. Only the
-- assetco_series *link* table above needed scoping.
