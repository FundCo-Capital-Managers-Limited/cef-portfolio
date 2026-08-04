-- IC Engagement Portal, Milestone 7: minutes and the resolution lock. One
-- minutes record per meeting (created on first access, see
-- icMinutesService.getOrCreateMinutes) that can be freely drafted/edited
-- while DRAFT/UNDER_REVIEW, then locked once - locking is one-way (no
-- unlock endpoint exists), matching the scope doc's "locked final minutes
-- and resolutions" control requirement. A correction after locking would
-- need a fresh matter/decision, not a mutated minutes record.

create table if not exists ic_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references ic_meetings(id) on delete cascade,
  content text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'UNDER_REVIEW', 'LOCKED')),
  drafted_by_user_id uuid references users(id),
  drafted_by_email text,
  locked_by_user_id uuid references users(id),
  locked_by_email text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ic_minutes enable row level security;

create policy "ic_users_read_minutes" on ic_minutes for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_minutes" on ic_minutes for insert with check (public.current_user_can_access_ic());
create policy "ic_users_update_minutes" on ic_minutes for update using (public.current_user_can_access_ic());
