-- CEF-PIP MVP schema
-- Tables: users, assetcos, customers, assets, events, payments, faults, sync_state

create extension if not exists "pgcrypto";

-- AssetCos (GroSolar, EML, SSM, DemoSolar test harness, etc.)
create table if not exists assetcos (
  id text primary key,                 -- e.g. 'GROSOLAR', 'DEMOSOLAR'
  name text not null,
  hmac_secret text not null,           -- per-AssetCo signing secret for HMAC verification
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Platform users (CEF staff)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,   -- references Supabase auth.users.id
  email text not null unique,
  role text not null check (role in ('executive', 'management', 'finance', 'ops', 'it_admin')),
  created_at timestamptz not null default now()
);

-- Customers (owned by AssetCo, mirrored here for reporting)
create table if not exists customers (
  id text primary key,                 -- AssetCo-provided customerId, e.g. 'CUS-0042'
  assetco_id text not null references assetcos(id),
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  sync_status text not null default 'PENDING' check (sync_status in ('SYNCED','PENDING','STALE','ERROR'))
);

-- Assets (CEF-funded assets, authoritative registry)
create table if not exists assets (
  id text primary key,                 -- AssetCo-provided assetId, e.g. 'GS-1001'
  assetco_id text not null references assetcos(id),
  customer_id text references customers(id),
  status text not null default 'created' check (status in ('created','deployed','disabled','enabled','decommissioned')),
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  sync_status text not null default 'PENDING' check (sync_status in ('SYNCED','PENDING','STALE','ERROR')),
  last_event_id uuid
);

-- Raw event ingestion log (append-only, source of truth for what was received)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  assetco_id text not null references assetcos(id),
  asset_id text,
  customer_id text,
  amount numeric,
  currency text,
  source_ref text,
  metadata jsonb,
  raw_payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create index if not exists idx_events_assetco_type on events (assetco_id, event_type);
create index if not exists idx_events_asset on events (asset_id);

-- Payments (derived from payment.* events)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  assetco_id text not null references assetcos(id),
  asset_id text references assets(id),
  customer_id text references customers(id),
  amount numeric not null,
  currency text not null default 'NGN',
  status text not null check (status in ('received','missed','defaulted')),
  source_ref text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  event_id uuid references events(id)
);

create index if not exists idx_payments_asset on payments (asset_id);
create index if not exists idx_payments_status on payments (status);

-- Faults (derived from asset.fault.* events)
create table if not exists faults (
  id uuid primary key default gen_random_uuid(),
  assetco_id text not null references assetcos(id),
  asset_id text references assets(id),
  status text not null default 'open' check (status in ('open','resolved')),
  detected_at timestamptz not null,
  resolved_at timestamptz,
  detail jsonb,
  created_at timestamptz not null default now(),
  event_id uuid references events(id)
);

create index if not exists idx_faults_status on faults (status);

-- Per-AssetCo cashflow rollup state (kept current by Cashflow Engine on each event)
create table if not exists cashflow_state (
  asset_id text primary key references assets(id),
  assetco_id text not null references assetcos(id),
  customer_id text references customers(id),
  total_collected numeric not null default 0,
  outstanding_balance numeric not null default 0,
  missed_count integer not null default 0,
  is_defaulted boolean not null default false,
  defaulted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Alerts sent by the Alert Engine (audit trail of notifications)
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (alert_type in ('payment.defaulted','asset.fault.detected')),
  assetco_id text not null references assetcos(id),
  asset_id text references assets(id),
  customer_id text references customers(id),
  message text not null,
  sent_at timestamptz not null default now(),
  event_id uuid references events(id)
);

-- Sync heartbeat / integration health per AssetCo
create table if not exists sync_state (
  assetco_id text primary key references assetcos(id),
  last_heartbeat_at timestamptz,
  last_reconciliation_at timestamptz,
  last_reconciliation_status text check (last_reconciliation_status in ('OK','MISMATCH','ERROR')),
  updated_at timestamptz not null default now()
);

-- Row-Level Security: enable on all tables; policies are added per-role in a follow-up
-- migration once Supabase Auth roles (executive/management/finance/ops/it_admin) are wired up.
alter table assetcos enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table assets enable row level security;
alter table events enable row level security;
alter table payments enable row level security;
alter table faults enable row level security;
alter table cashflow_state enable row level security;
alter table alerts enable row level security;
alter table sync_state enable row level security;
