-- Adds what's needed for suspend/delete-user actions on the User Management
-- page: an is_active flag (suspension without losing the account/history)
-- and an optional display name (not every existing account has one, so it's
-- nullable — the UI falls back to email where it's not set).

alter table users add column if not exists name text;
alter table users add column if not exists is_active boolean not null default true;

-- Suspending a user bans them in Supabase Auth (blocks new sign-ins) and the
-- API's own middleware rejects an already-issued JWT going forward, but
-- neither of those retroactively revokes direct browser reads through RLS —
-- is_cef_user()/current_user_role() only checked "does a row exist", not
-- whether it's active. Close that gap at the source.
create or replace function public.is_cef_user()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where auth_user_id = auth.uid() and is_active
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.users where auth_user_id = auth.uid() and is_active;
$$;
