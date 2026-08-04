-- Credit Risk flagging + targeted notifications.
--
-- Distinct from the existing bell (api/src/controllers/notificationsController.js),
-- which is a single per-user "lastSeenAt" cursor over the whole audit_log,
-- broadcast to every CEF-wide user with no per-item read state and no
-- targeting. Flags need real per-recipient tracking (only finance/
-- management/it_admin should be notified when Risk flags something, not
-- ops/executive/risk-other-than-the-raiser) and a shared item state anyone
-- who opens the flag can see (comments, who's viewed it, resolved/open) -
-- independent of each recipient's own unread badge. See
-- documents/PHASE_2_ROADMAP.md for the fuller design note; this table shape
-- is also the foundation the upcoming approval workflow will reuse.

create table if not exists flags (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  assetco_id text references assetcos(id),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_by_user_id uuid references users(id) on delete set null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_email text
);

create index if not exists idx_flags_status on flags (status);
create index if not exists idx_flags_assetco on flags (assetco_id);

create table if not exists flag_views (
  flag_id uuid not null references flags(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (flag_id, user_id)
);

create table if not exists flag_comments (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references flags(id) on delete cascade,
  author_user_id uuid references users(id) on delete set null,
  author_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_flag_comments_flag on flag_comments (flag_id, created_at);

-- Generic notification shape (not flag-specific in name) so the upcoming
-- approval workflow can reuse the same delivery/read-state mechanism rather
-- than inventing a second one. flag_id is nullable for that reason, even
-- though flags are the only producer today.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  flag_id uuid references flags(id) on delete cascade,
  created_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists notification_recipients (
  notification_id uuid not null references notifications(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  read_at timestamptz,
  primary key (notification_id, user_id)
);

create index if not exists idx_notification_recipients_user on notification_recipients (user_id, read_at);

alter table flags enable row level security;
alter table flag_views enable row level security;
alter table flag_comments enable row level security;
alter table notifications enable row level security;
alter table notification_recipients enable row level security;

-- Flags/comments/views are CEF-internal, not AssetCo-external — same
-- is_cef_user() gate already used for series/facilities/applications.
create policy "cef_users_read_flags" on flags for select using (public.is_cef_user());
create policy "cef_users_read_flag_views" on flag_views for select using (public.is_cef_user());
create policy "cef_users_read_flag_comments" on flag_comments for select using (public.is_cef_user());
create policy "cef_users_read_notifications" on notifications for select using (public.is_cef_user());

-- notification_recipients is per-user by design — only readable by the
-- recipient it names, not by is_cef_user() broadly (that would let anyone
-- see everyone else's personal read state).
create policy "own_notification_recipients" on notification_recipients for select using (
  user_id in (select id from public.users where auth_user_id = auth.uid())
);
