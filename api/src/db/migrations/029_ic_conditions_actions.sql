-- IC Engagement Portal, Milestone 6: conditions and actions. Per the scope
-- doc's Section 9 ("every condition or action should be created as a
-- structured record rather than left inside narrative minutes or an
-- email"), these attach to a matter (optionally tied to the decision that
-- created them) with an owner, due date, and status - not just an audit-log
-- entry, since these are actionable obligations that need to be tracked to
-- closure, not just a record that something happened.

create table if not exists ic_conditions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references ic_matters(id) on delete cascade,
  decision_id uuid references ic_decisions(id),
  type text not null check (type in (
    'CP_TO_DOCUMENTATION', 'CP_TO_FIRST_DRAWDOWN', 'CP_TO_LATER_DRAWDOWN',
    'CONDITION_SUBSEQUENT', 'COVENANT', 'INFORMATION_UNDERTAKING',
    'MONITORING_REQUIREMENT', 'MANAGEMENT_ACTION', 'IC_ACTION'
  )),
  wording text not null,
  owner_user_id uuid references users(id),
  due_date date,
  status text not null default 'OPEN' check (status in (
    'OPEN', 'PENDING_EVIDENCE', 'UNDER_REVIEW', 'SATISFIED', 'WAIVED', 'OVERDUE', 'BREACHED'
  )),
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ic_conditions_matter on ic_conditions (matter_id);
create index if not exists idx_ic_conditions_owner on ic_conditions (owner_user_id);
create index if not exists idx_ic_conditions_due_date on ic_conditions (due_date);

alter table ic_conditions enable row level security;

create policy "ic_users_read_conditions" on ic_conditions for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_conditions" on ic_conditions for insert with check (public.current_user_can_access_ic());
create policy "ic_users_update_conditions" on ic_conditions for update using (public.current_user_can_access_ic());

-- Lets a condition-related notification deep-link straight to the matter it
-- belongs to (same pattern as notifications.flag_id from migration 021) -
-- the notifications table itself is shared across CEF-PIP and the IC
-- portal, so this is additive, not IC-specific schema living somewhere odd.
alter table notifications add column if not exists ic_matter_id uuid references ic_matters(id);
