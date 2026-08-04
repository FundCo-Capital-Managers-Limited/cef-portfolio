-- IC Engagement Portal, Milestone 4: meetings and agenda. teams_link is a
-- plain editable field, not a separate "recurring meeting settings" concept -
-- the team already reuses the same Teams link and just changes date/time, so
-- the API pre-fills a new meeting's link from the most recent meeting's
-- link (see icMeetingService.getDefaultTeamsLink), but nothing stops it being
-- changed if the recurring meeting itself ever gets recreated.

create table if not exists ic_meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_date timestamptz not null,
  teams_link text,
  status text not null default 'SCHEDULED' check (status in (
    'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  )),
  chair_user_id uuid references users(id),
  secretary_user_id uuid references users(id),
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ic_meetings_date on ic_meetings (meeting_date);

create table if not exists ic_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references ic_meetings(id) on delete cascade,
  matter_id uuid not null references ic_matters(id) on delete cascade,
  sequence integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (meeting_id, matter_id)
);

create index if not exists idx_ic_agenda_items_meeting on ic_agenda_items (meeting_id);

alter table ic_meetings enable row level security;
alter table ic_agenda_items enable row level security;

create policy "ic_users_read_meetings" on ic_meetings for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_meetings" on ic_meetings for insert with check (public.current_user_can_access_ic());
create policy "ic_users_update_meetings" on ic_meetings for update using (public.current_user_can_access_ic());

create policy "ic_users_read_agenda_items" on ic_agenda_items for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_agenda_items" on ic_agenda_items for insert with check (public.current_user_can_access_ic());
create policy "ic_users_delete_agenda_items" on ic_agenda_items for delete using (public.current_user_can_access_ic());
