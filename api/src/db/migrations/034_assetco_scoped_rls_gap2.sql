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

-- Tables keyed by a plain `assetco_id` column.
do $$
declare
  t text;
begin
  foreach t in array array[
    'infracredit_relationships', 'assetco_series', 'cef_facilities',
    'cef_facility_repayments', 'cef_facility_schedule', 'flags',
    'facility_repayment_notifications'
  ]
  loop
    execute format('drop policy if exists "cef_users_read_%1$s" on %1$I;', t);
    execute format(
      'create policy "role_scoped_read_%1$s" on %1$I for select using (
         case public.current_user_role()
           when ''assetco_admin'' then assetco_id = public.current_user_assetco_id()
           when ''assetco_dev'' then assetco_id = any(public.current_user_dev_assetco_ids())
           else public.is_cef_user()
         end
       );',
      t
    );
  end loop;
end $$;

-- facility_documents/security/covenants carry facility_id, not assetco_id
-- directly — scope through a join to cef_facilities.
do $$
declare
  t text;
begin
  foreach t in array array['facility_documents', 'facility_security', 'facility_covenants']
  loop
    execute format('drop policy if exists "cef_users_read_%1$s" on %1$I;', t);
    execute format(
      'create policy "role_scoped_read_%1$s" on %1$I for select using (
         case public.current_user_role()
           when ''assetco_admin'' then exists (
             select 1 from cef_facilities f
             where f.id = %1$I.facility_id and f.assetco_id = public.current_user_assetco_id()
           )
           when ''assetco_dev'' then exists (
             select 1 from cef_facilities f
             where f.id = %1$I.facility_id and f.assetco_id = any(public.current_user_dev_assetco_ids())
           )
           else public.is_cef_user()
         end
       );',
      t
    );
  end loop;
end $$;

-- cef_series itself is not per-AssetCo (it's CEF's own funding rounds, shared
-- across the portfolio) — left on is_cef_user(), same as before. Only the
-- assetco_series *link* table above needed scoping.
