-- IC Engagement Portal, Milestone 2: the Matter register — the umbrella
-- record everything else (documents, meetings, votes, conditions, actions)
-- in later milestones attaches to. Category is the 6 top-level buckets from
-- the IC Operating System scope doc (Section 3); decision_type is free text
-- for the specific subtype (e.g. "Preliminary approval", "Covenant breach")
-- since that list runs to 50+ entries and the source doc itself says these
-- should be configurable, not hard-coded.

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
      and (role in ('management', 'executive', 'it_admin') or can_access_ic)
  );
$$;

create table if not exists ic_matters (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'NEW_INVESTMENT', 'DISBURSEMENT', 'PORTFOLIO_MANAGEMENT',
    'PROBLEM_ASSET', 'EXIT_CLOSURE', 'POLICY'
  )),
  decision_type text not null,
  title text not null,
  description text,
  assetco_id text references assetcos(id),
  deal_lead_user_id uuid references users(id),
  status text not null default 'OPEN' check (status in (
    'OPEN', 'UNDER_REVIEW', 'SCHEDULED', 'DECIDED', 'CLOSED', 'WITHDRAWN'
  )),
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ic_matters_status on ic_matters (status);
create index if not exists idx_ic_matters_assetco on ic_matters (assetco_id);

alter table ic_matters enable row level security;

create policy "ic_users_read_matters" on ic_matters for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_matters" on ic_matters for insert with check (public.current_user_can_access_ic());
create policy "ic_users_update_matters" on ic_matters for update using (public.current_user_can_access_ic());
