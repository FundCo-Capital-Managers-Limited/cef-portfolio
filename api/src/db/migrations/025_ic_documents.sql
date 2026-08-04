-- IC Engagement Portal, Milestone 3: document references. No file storage
-- lives here or anywhere in CEF-PIP — the actual file sits in the team's own
-- SharePoint dataroom (already covered by the existing M365 Business Basic
-- plan, no new spend). This table is just a pointer + status + confirmation
-- record, matching the manual-upload workflow the team wants: someone
-- uploads to SharePoint themselves, pastes the resulting URL here, and ticks
-- that it's uploaded and shared. sharepoint_url works identically whether a
-- human pasted it or, someday, a Graph API integration wrote it — nothing
-- here has to change if that's ever built.

create table if not exists ic_documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references ic_matters(id) on delete cascade,
  title text not null,
  classification text not null,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EXECUTED', 'SUPERSEDED', 'EXPIRED', 'ARCHIVED'
  )),
  sharepoint_url text,
  confirmed_by_user_id uuid references users(id),
  confirmed_by_email text,
  confirmed_at timestamptz,
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ic_documents_matter on ic_documents (matter_id);

alter table ic_documents enable row level security;

create policy "ic_users_read_documents" on ic_documents for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_documents" on ic_documents for insert with check (public.current_user_can_access_ic());
create policy "ic_users_update_documents" on ic_documents for update using (public.current_user_can_access_ic());
