-- IC Engagement Portal, Milestone 5a: the committee roster. Membership isn't
-- fixed and changes over time, so this is add/remove-with-history (removed_at
-- set, row kept) rather than a hard delete - quorum/voting later in this
-- milestone reads "who's an active member right now" as removed_at is null.
-- is_chair/is_secretary are flags on a membership row, not separate roles -
-- the person holding either responsibility can change without touching
-- users.role at all.

create table if not exists ic_committee_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  is_chair boolean not null default false,
  is_secretary boolean not null default false,
  added_at timestamptz not null default now(),
  added_by_email text,
  removed_at timestamptz,
  removed_by_email text
);

-- A user can only be an active (not-yet-removed) member once, but can be
-- re-added after being removed (a new row) - history of past membership
-- stays intact rather than being overwritten.
create unique index if not exists idx_ic_committee_members_active_user
  on ic_committee_members (user_id) where removed_at is null;

alter table ic_committee_members enable row level security;

create policy "ic_users_read_committee_members" on ic_committee_members for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_committee_members" on ic_committee_members for insert with check (public.current_user_can_access_ic());
create policy "ic_users_update_committee_members" on ic_committee_members for update using (public.current_user_can_access_ic());
