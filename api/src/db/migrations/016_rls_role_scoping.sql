-- Phase 6 pre-prod hardening: close two RLS gaps flagged while building the
-- assetco_dev role.
--
-- Gap 1 — row scoping: every policy since migration 002 used is_cef_user(),
-- which is true for ANY provisioned user regardless of role. That was a fine
-- MVP simplification when every role was CEF-internal and equally trusted,
-- but assetco_admin/assetco_dev are now real external logins — today their
-- restriction to "their own AssetCo(s) only" is enforced solely in app code
-- (dashboard/lib/data.js queries, requireRole/canAccessAssetco) and Next.js
-- middleware, not in Postgres. A user holding the anon/authenticated key can
-- craft a raw query bypassing all of that. This migration makes Postgres
-- itself enforce the same scoping.
--
-- Gap 2 — column scoping: RLS is row-level only. assetcos.hmac_secret and
-- assetcos.reconciliation_token were relying entirely on app code (column
-- allowlists in dashboard/lib/data.js, stripSecrets() in assetcoService.js)
-- to never reach the browser. This migration adds a view that excludes both
-- columns, so the guarantee holds even if a future query forgets to strip.

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.users where auth_user_id = auth.uid();
$$;

create or replace function public.current_user_assetco_id()
returns text
language sql
security definer
stable
as $$
  select assetco_id from public.users where auth_user_id = auth.uid();
$$;

create or replace function public.current_user_dev_assetco_ids()
returns text[]
language sql
security definer
stable
as $$
  select coalesce(array_agg(uada.assetco_id), array[]::text[])
  from public.user_assetco_dev_access uada
  join public.users u on u.id = uada.user_id
  where u.auth_user_id = auth.uid();
$$;

-- Tables keyed by a plain `assetco_id` column: replace the blanket
-- is_cef_user() policy with role-aware scoping. CEF-wide roles keep full
-- access; assetco_admin/assetco_dev are limited to their own AssetCo(s).
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'assets', 'events', 'payments', 'faults',
    'cashflow_state', 'alerts', 'sync_state', 'reconciliation_log'
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

-- assetcos itself is keyed by `id`, not `assetco_id` — same logic, different column.
drop policy if exists "cef_users_read_assetcos" on assetcos;
create policy "role_scoped_read_assetcos" on assetcos for select using (
  case public.current_user_role()
    when 'assetco_admin' then id = public.current_user_assetco_id()
    when 'assetco_dev' then id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);

-- audit_log, users (CEF-wide roster read), and user_assetco_dev_access are
-- CEF-internal — assetco_admin/assetco_dev never need these, so tighten from
-- is_cef_user() to CEF-wide roles only. users_read_self stays untouched
-- (RLS policies are OR'd, so every role can still resolve its own row).
drop policy if exists "cef_users_read_audit_log" on audit_log;
create policy "cef_wide_read_audit_log" on audit_log for select using (
  public.current_user_role() in ('executive', 'management', 'finance', 'ops', 'it_admin')
);

drop policy if exists "cef_users_read_user_assetco_dev_access" on user_assetco_dev_access;
create policy "cef_wide_read_user_assetco_dev_access" on user_assetco_dev_access for select using (
  public.current_user_role() in ('executive', 'management', 'finance', 'ops', 'it_admin')
);

create policy "cef_wide_read_users" on users for select using (
  public.current_user_role() in ('executive', 'management', 'finance', 'ops', 'it_admin')
);

-- Column scoping: a view that can never expose hmac_secret/reconciliation_token,
-- regardless of what app code does. security_invoker makes it run with the
-- querying user's own privileges, so the role-scoped RLS policy on the base
-- `assetcos` table above still applies to rows read through this view.
create or replace view public.assetcos_public
with (security_invoker = true) as
select
  id, name, is_active, created_at, base_url, legal_entity_name, registration_number, website,
  pipeline_stage, asset_types, customer_types, sector, business_description, hq_state, operating_states,
  primary_contact_name, primary_contact_email, primary_contact_phone, logo_url, integration_type,
  stage_updated_at, stage_updated_by, internal_notes
from public.assetcos;

grant select on public.assetcos_public to authenticated;
