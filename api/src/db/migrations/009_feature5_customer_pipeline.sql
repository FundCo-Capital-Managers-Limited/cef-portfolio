-- Feature 5 (Mid-Sprint Change Spec): Customer & Asset Pipeline Visibility.
--
-- status defaults to PIPELINE (matches the lifecycle description in the
-- spec's own §7.2, not the §7.3 SQL's literal 'ACTIVE' default — the two
-- contradict each other; PIPELINE is the correct default since a brand-new
-- customer record has no asset yet). Per instruction, the person/system
-- creating the customer may always override this at creation time — this
-- matters for AssetCos onboarding with pre-existing active customers, and
-- must be documented in the AssetCo Integration Guide.

alter table customers add column if not exists status text not null default 'PIPELINE'
  check (status in ('PIPELINE', 'ASSET_ORDERED', 'INSTALLATION_SCHEDULED', 'ACTIVE', 'IN_ARREARS', 'DEFAULTED', 'CHURNED'));
alter table customers add column if not exists contract_signed_date date;
alter table customers add column if not exists expected_installation_date date;
alter table customers add column if not exists expected_monthly_payment_ngn numeric;
alter table customers add column if not exists contract_term_months integer;
alter table customers add column if not exists location_state text;
alter table customers add column if not exists location_lga text;
alter table customers add column if not exists customer_segment text
  check (customer_segment in ('RESIDENTIAL', 'SME', 'COMMERCIAL', 'COMMUNITY', 'INSTITUTION'));
alter table customers add column if not exists pipeline_notes text;

-- No change needed to cashflow KPI queries to "exclude" pipeline customers —
-- cashflow_state rows only ever get created once a payment event fires for
-- an asset, so a customer with no deployed asset yet is already absent from
-- every cashflow aggregation in this codebase.

create table if not exists customer_stage_log (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references customers(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references users(id),
  changed_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_customer_stage_log_customer on customer_stage_log (customer_id, changed_at desc);

alter table customer_stage_log enable row level security;
create policy "cef_users_read_customer_stage_log" on customer_stage_log for select using (public.is_cef_user());
