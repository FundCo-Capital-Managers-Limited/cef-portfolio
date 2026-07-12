-- Week 4: Asset Registry & Reconciliation support.
--
-- base_url / reconciliation_token let CEF-PIP pull from an AssetCo's own
-- mandatory reconciliation endpoints (architecture doc §7.3). Both are
-- nullable — an AssetCo without a base_url configured is simply skipped by
-- the nightly reconciliation run rather than erroring.

alter table assetcos add column if not exists base_url text;
alter table assetcos add column if not exists reconciliation_token text;

-- One row per nightly (or manually triggered) reconciliation run per AssetCo,
-- recording what mismatched between the local ledger and the AssetCo's own
-- reconciliation endpoints. This is the audit trail referenced in the
-- architecture doc's Compliance Engine section — full enforcement is Phase 2,
-- but the underlying mismatch log starts here.
create table if not exists reconciliation_log (
  id uuid primary key default gen_random_uuid(),
  assetco_id text not null references assetcos(id),
  run_at timestamptz not null default now(),
  status text not null check (status in ('OK', 'MISMATCH', 'ERROR')),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reconciliation_log_assetco on reconciliation_log (assetco_id, run_at desc);

alter table reconciliation_log enable row level security;
create policy "cef_users_read_reconciliation_log" on reconciliation_log for select using (public.is_cef_user());
