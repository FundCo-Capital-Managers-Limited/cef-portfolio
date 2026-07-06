-- RLS policies for the MVP dashboard.
--
-- MVP scope keeps this simple: any authenticated user with a row in `users`
-- (i.e. provisioned by an IT admin, tagged with a role) can read all
-- dashboard-relevant tables. Per-role data partitioning (Finance Analyst:
-- financial only, Operations Monitor: operational only, etc. — see
-- architecture doc Section 12) is a Phase 2 hardening item once the platform
-- has more than one internal consumer to isolate.
--
-- Writes are performed exclusively by the backend using the Supabase
-- service-role key (which bypasses RLS entirely), so no write policies are
-- defined here — the dashboard is read-only from the browser's perspective.

create or replace function public.is_cef_user()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where auth_user_id = auth.uid()
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'assetcos', 'customers', 'assets', 'events', 'payments',
    'faults', 'cashflow_state', 'alerts', 'sync_state'
  ]
  loop
    execute format(
      'create policy "cef_users_read_%1$s" on %1$I for select using (public.is_cef_user());',
      t
    );
  end loop;
end $$;

-- Users can read their own row (needed to resolve their role after login).
create policy "users_read_self" on users for select using (auth_user_id = auth.uid());
