-- Feature 3 (Mid-Sprint Change Spec): CEF Series Funding Tracking (Series A, B, C).
--
-- total_deployed_ngn is NOT stored here (unlike the doc's SQL) — it's a sum
-- over assetco_series and would drift the moment a disbursement is recorded
-- without a matching trigger. Computed on read instead (see seriesService.js),
-- consistent with how cashflow_state/reconciliation already work in this repo.

create table if not exists cef_series (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code in ('SERIES_A', 'SERIES_B', 'SERIES_C', 'FUTURE')),
  display_name text not null,
  status text not null default 'UPCOMING' check (status in ('OPEN', 'CLOSED', 'UPCOMING', 'PLANNING')),
  total_fund_size_ngn numeric,
  close_date date,
  description text,
  created_at timestamptz not null default now()
);

insert into cef_series (code, display_name, status, description) values
  ('SERIES_A', 'Series A', 'CLOSED', 'CEF first fundraising round — closed and fully deployed.'),
  ('SERIES_B', 'Series B', 'CLOSED', 'CEF second fundraising round — closed and fully deployed.'),
  ('SERIES_C', 'Series C', 'UPCOMING', 'CEF third fundraising round — in planning.'),
  ('FUTURE', 'Future Consideration', 'PLANNING', 'For AssetCos being considered for a future series not yet defined.')
on conflict (code) do nothing;

create table if not exists assetco_series (
  id uuid primary key default gen_random_uuid(),
  assetco_id text not null references assetcos(id) on delete cascade,
  series_id uuid not null references cef_series(id),
  disbursement_amount_ngn numeric,
  disbursement_date date,
  instrument_type text not null default 'DEBT' check (instrument_type in ('EQUITY', 'DEBT', 'CONVERTIBLE', 'GRANT')),
  status text not null default 'CANDIDATE' check (status in ('CANDIDATE', 'COMMITTED', 'DISBURSED', 'EXITED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assetco_id, series_id)
);

create index if not exists idx_assetco_series_assetco on assetco_series (assetco_id);
create index if not exists idx_assetco_series_series on assetco_series (series_id);

-- Records which CEF series funded the capital deployed for a specific asset
-- (an AssetCo funded under both Series A and B may have assets under each).
alter table assets add column if not exists cef_series_id uuid references cef_series(id);

alter table cef_series enable row level security;
alter table assetco_series enable row level security;
create policy "cef_users_read_series" on cef_series for select using (public.is_cef_user());
create policy "cef_users_read_assetco_series" on assetco_series for select using (public.is_cef_user());
