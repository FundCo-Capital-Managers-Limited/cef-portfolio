-- AssetCo Developer role: self-service HMAC signing-secret access for an
-- AssetCo's own dev/IT team, without needing CEF's involvement each time.
--
-- Distinct from assetco_admin (which is pinned to exactly one AssetCo via
-- users.assetco_id) because the same dev team can build integrations for
-- more than one AssetCo (e.g. one contractor builds both GroSolar's and
-- EML's platforms) — a many-to-many join table, not a single column, is
-- needed to express "this login can act as a developer for these AssetCos".

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('executive', 'management', 'finance', 'ops', 'it_admin', 'assetco_admin', 'assetco_dev'));

create table if not exists user_assetco_dev_access (
  user_id uuid not null references users(id) on delete cascade,
  assetco_id text not null references assetcos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, assetco_id)
);

create index if not exists idx_user_assetco_dev_access_assetco on user_assetco_dev_access (assetco_id);

alter table user_assetco_dev_access enable row level security;
create policy "cef_users_read_user_assetco_dev_access" on user_assetco_dev_access for select using (public.is_cef_user());
