-- Foundations for the Mid-Sprint Change Specification features (Weeks 5-6).
--
-- Shared infrastructure needed by nearly every new feature: a generic audit
-- log (referenced constantly across the spec's write endpoints), an in-app
-- notification mechanism built on top of it (per user requirement — no email,
-- just a bell icon + periodic prompt), a new assetco_admin role scoped to a
-- single AssetCo, and the ownership_model distinction some AssetCos need
-- (outright purchase / lease-to-own / metered pay-as-you-go with no eventual
-- ownership transfer).

-- Generic audit trail. Every user- or API-driven mutation the new features
-- introduce writes one row here. actor_user_id is null for AssetCo-webhook-
-- driven changes (no CEF-PIP user initiated them) — actor_type distinguishes
-- "who/what" made the change for the notification feed.
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('user', 'assetco_api', 'system')),
  actor_user_id uuid references users(id),
  actor_assetco_id text references assetcos(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on audit_log (created_at desc);
create index if not exists idx_audit_log_entity on audit_log (entity_type, entity_id);

alter table audit_log enable row level security;
create policy "cef_users_read_audit_log" on audit_log for select using (public.is_cef_user());

-- Per-user "last seen" cursor against the audit log — this is the entire
-- notification mechanism. Unread count = audit_log rows newer than the
-- cursor; "mark as read" just bumps last_seen_at. No separate notifications
-- table to keep in sync.
create table if not exists notification_cursors (
  user_id uuid primary key references users(id),
  last_seen_at timestamptz not null default now()
);

alter table notification_cursors enable row level security;
create policy "users_manage_own_cursor" on notification_cursors for all
  using (user_id = (select id from users where auth_user_id = auth.uid()))
  with check (user_id = (select id from users where auth_user_id = auth.uid()));

-- New role: an AssetCo's own rep, scoped to their AssetCo only.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('executive', 'management', 'finance', 'ops', 'it_admin', 'assetco_admin'));

alter table users add column if not exists assetco_id text references assetcos(id);
-- Required (enforced at the application layer, not DB) when role = 'assetco_admin'.

-- Ownership model: not every deployed asset is headed toward customer
-- ownership. GroSolar, for example, has outright-purchase customers,
-- lease-to-own customers, and metered pay-as-you-go customers who buy power
-- through the app and never own the underlying asset.
alter table assets add column if not exists ownership_model text
  not null default 'LEASE_TO_OWN'
  check (ownership_model in ('OUTRIGHT_PURCHASE', 'LEASE_TO_OWN', 'PAYG_METERED'));
