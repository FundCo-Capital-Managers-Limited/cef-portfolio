-- Feature 7 (Facility & Repayment Addendum): CEF's own loan book — facilities
-- CEF extends to each AssetCo and the repayments received back, distinct
-- from the customer -> AssetCo cashflow already tracked (cashflow_state).
-- Adapted from the addendum's SQL: assetco_id/asset FKs are TEXT (this
-- repo's natural keys, not the addendum's assumed UUIDs), amounts are
-- `numeric` in whole NGN (matches every other money column here, not the
-- addendum's ambiguous "NGN kobo or whole NGN — be consistent").

create table if not exists cef_facilities (
  id uuid primary key default gen_random_uuid(),
  assetco_id text not null references assetcos(id) on delete restrict,
  series_id uuid references cef_series(id),
  facility_reference text unique,
  facility_type text not null default 'LOAN'
    check (facility_type in ('LOAN', 'EQUITY', 'CONVERTIBLE_NOTE', 'GRANT', 'BLENDED')),
  principal_amount_ngn numeric not null,
  currency text not null default 'NGN',
  interest_rate_percent numeric(6, 3),
  tenor_months integer,
  disbursement_date date,
  maturity_date date,
  repayment_frequency text default 'MONTHLY'
    check (repayment_frequency in ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BULLET', 'FLEXIBLE')),
  repayment_start_date date,
  grace_period_months integer default 0,
  scheduled_repayment_amount_ngn numeric,
  total_repaid_ngn numeric not null default 0,
  outstanding_balance_ngn numeric generated always as (principal_amount_ngn - total_repaid_ngn) stored,
  facility_status text not null default 'ACTIVE'
    check (facility_status in ('ACTIVE', 'FULLY_REPAID', 'IN_ARREARS', 'IN_DEFAULT', 'RESTRUCTURED', 'WRITTEN_OFF')),
  collateral_description text,
  covenant_notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create index if not exists idx_cef_facilities_assetco on cef_facilities (assetco_id);
create index if not exists idx_cef_facilities_series on cef_facilities (series_id);
create index if not exists idx_cef_facilities_status on cef_facilities (facility_status);

create table if not exists cef_facility_repayments (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete restrict,
  assetco_id text not null references assetcos(id),
  payment_date date not null,
  principal_paid_ngn numeric not null default 0,
  interest_paid_ngn numeric not null default 0,
  fees_paid_ngn numeric not null default 0,
  total_paid_ngn numeric generated always as (principal_paid_ngn + interest_paid_ngn + fees_paid_ngn) stored,
  payment_reference text,
  payment_type text not null default 'SCHEDULED'
    check (payment_type in ('SCHEDULED', 'EARLY_REPAYMENT', 'PARTIAL', 'RESTRUCTURED_PAYMENT')),
  period_covered text, -- YYYY-MM
  was_on_time boolean,
  days_late integer,
  notes text,
  recorded_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_cef_repayments_facility on cef_facility_repayments (facility_id, payment_date desc);
create index if not exists idx_cef_repayments_assetco on cef_facility_repayments (assetco_id, payment_date desc);

create table if not exists cef_facility_schedule (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete cascade,
  due_date date not null,
  period text, -- YYYY-MM
  principal_due_ngn numeric not null default 0,
  interest_due_ngn numeric not null default 0,
  total_due_ngn numeric generated always as (principal_due_ngn + interest_due_ngn) stored,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PAID', 'PARTIALLY_PAID', 'MISSED', 'WAIVED')),
  paid_amount_ngn numeric default 0,
  paid_date date
);

create index if not exists idx_cef_schedule_facility on cef_facility_schedule (facility_id, due_date);
create index if not exists idx_cef_schedule_due on cef_facility_schedule (due_date, status);

alter table assets add column if not exists cef_facility_id uuid references cef_facilities(id);

-- Auto-updates total_repaid_ngn (and therefore outstanding_balance_ngn) on
-- cef_facilities whenever a repayment is inserted/updated/deleted. Sums
-- principal_paid_ngn only — interest is separate income, not a reduction of
-- what's still owed on the principal.
create or replace function update_facility_total_repaid()
returns trigger as $$
declare
  target_facility_id uuid;
begin
  target_facility_id := coalesce(new.facility_id, old.facility_id);
  update cef_facilities
  set
    total_repaid_ngn = (
      select coalesce(sum(principal_paid_ngn), 0)
      from cef_facility_repayments
      where facility_id = target_facility_id
    ),
    updated_at = now()
  where id = target_facility_id;
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_update_facility_total_repaid on cef_facility_repayments;
create trigger trg_update_facility_total_repaid
after insert or update or delete on cef_facility_repayments
for each row execute function update_facility_total_repaid();

-- Widen the alerts table for the new facility-repayment alert types (ALT-14/
-- 15/16) and add facility/schedule references so the nightly arrears check
-- can avoid re-alerting on the same missed payment every night.
alter table alerts drop constraint if exists alerts_alert_type_check;
alter table alerts add constraint alerts_alert_type_check check (alert_type in (
  'payment.defaulted', 'asset.fault.detected',
  'CEF_FACILITY_REPAYMENT_MISSED', 'CEF_FACILITY_7_DAYS_OVERDUE', 'CEF_FACILITY_APPROACHING_MATURITY'
));
alter table alerts add column if not exists facility_id uuid references cef_facilities(id);
alter table alerts add column if not exists schedule_id uuid references cef_facility_schedule(id);

alter table cef_facilities enable row level security;
alter table cef_facility_repayments enable row level security;
alter table cef_facility_schedule enable row level security;
create policy "cef_users_read_facilities" on cef_facilities for select using (public.is_cef_user());
create policy "cef_users_read_facility_repayments" on cef_facility_repayments for select using (public.is_cef_user());
create policy "cef_users_read_facility_schedule" on cef_facility_schedule for select using (public.is_cef_user());
