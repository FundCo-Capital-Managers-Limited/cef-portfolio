-- Pre-meeting memo Q&A (Ade's ask, 2026-08-05 walkthrough): IC members
-- should be able to read a matter and post questions/comments ahead of the
-- meeting, so discussion in the room is targeted rather than starting cold.
-- Same access gate as ic_matters/ic_documents (current_user_can_access_ic()).

create table if not exists ic_matter_comments (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references ic_matters(id) on delete cascade,
  body text not null,
  author_user_id uuid references users(id),
  author_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ic_matter_comments_matter on ic_matter_comments (matter_id, created_at);

alter table ic_matter_comments enable row level security;

create policy "ic_users_read_matter_comments" on ic_matter_comments for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_matter_comments" on ic_matter_comments for insert with check (public.current_user_can_access_ic());
