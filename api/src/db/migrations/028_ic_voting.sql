-- IC Engagement Portal, Milestone 5b: conflicts, voting, and decisions.
-- Conflicts/votes are scoped to (meeting, matter, member) - a member can be
-- conflicted on one agenda item and fine on another in the same meeting.
-- Declaring a conflict is treated as an automatic recusal from voting on
-- that matter (per the scope doc's "automatic quorum recalculation after
-- recusal"), computed at read time rather than a separate flag to keep it
-- from drifting out of sync with the declaration itself.

create table if not exists ic_conflict_declarations (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references ic_meetings(id) on delete cascade,
  matter_id uuid not null references ic_matters(id) on delete cascade,
  user_id uuid not null references users(id),
  reason text,
  created_at timestamptz not null default now(),
  unique (meeting_id, matter_id, user_id)
);

create table if not exists ic_votes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references ic_meetings(id) on delete cascade,
  matter_id uuid not null references ic_matters(id) on delete cascade,
  user_id uuid not null references users(id),
  value text not null check (value in ('APPROVE', 'REJECT', 'ABSTAIN')),
  cast_at timestamptz not null default now(),
  unique (meeting_id, matter_id, user_id)
);

-- Outcome vocabulary matches the IC Operating System scope doc's own
-- decision-outcomes list (Section 7) - recording one locks in the result and
-- moves the matter's own status to DECIDED (see icVotingService.recordDecision).
create table if not exists ic_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references ic_meetings(id) on delete cascade,
  matter_id uuid not null references ic_matters(id) on delete cascade,
  outcome text not null check (outcome in (
    'APPROVED', 'APPROVED_WITH_CONDITIONS', 'APPROVED_WITHIN_REVISED_PARAMETERS',
    'APPROVED_UNDER_DELEGATED_AUTHORITY', 'DEFERRED', 'RETURNED', 'DECLINED',
    'NOTED', 'RATIFIED', 'WITHDRAWN'
  )),
  quorum_met boolean not null,
  votes_for integer not null default 0,
  votes_against integer not null default 0,
  votes_abstain integer not null default 0,
  decided_by_user_id uuid references users(id),
  decided_by_email text,
  decided_at timestamptz not null default now(),
  unique (meeting_id, matter_id)
);

create index if not exists idx_ic_conflicts_meeting_matter on ic_conflict_declarations (meeting_id, matter_id);
create index if not exists idx_ic_votes_meeting_matter on ic_votes (meeting_id, matter_id);

alter table ic_conflict_declarations enable row level security;
alter table ic_votes enable row level security;
alter table ic_decisions enable row level security;

create policy "ic_users_read_conflicts" on ic_conflict_declarations for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_conflicts" on ic_conflict_declarations for insert with check (public.current_user_can_access_ic());

create policy "ic_users_read_votes" on ic_votes for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_votes" on ic_votes for insert with check (public.current_user_can_access_ic());
create policy "ic_users_update_votes" on ic_votes for update using (public.current_user_can_access_ic());

create policy "ic_users_read_decisions" on ic_decisions for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_decisions" on ic_decisions for insert with check (public.current_user_can_access_ic());
