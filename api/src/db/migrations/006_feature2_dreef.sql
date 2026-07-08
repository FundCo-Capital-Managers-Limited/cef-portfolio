-- Feature 2 (Mid-Sprint Change Spec): InfraCredit / DREEF Pipeline & Portfolio Tracking.
--
-- One row per AssetCo (one-to-one) tracking their relationship with
-- InfraCredit's DREEF programme, independent of and complementary to their
-- CEF pipeline_stage (Feature 1) — an AssetCo can be MANDATED by DREEF while
-- still in CEF's own DUE_DILIGENCE stage.
--
-- dreef_stage values are the document's own "informed estimate, verify with
-- IT Lead" enum — proceeding with them now per instruction, adjustable later
-- without a data migration since this is a single text column.

create table if not exists infracredit_relationships (
  id uuid primary key default gen_random_uuid(),
  assetco_id text unique not null references assetcos(id) on delete cascade,
  dreef_stage text not null default 'NOT_STARTED'
    check (dreef_stage in ('NOT_STARTED', 'INITIAL_ASSESSMENT', 'MANDATED', 'UNDER_GUARANTEE', 'DISBURSED', 'NOT_APPLICABLE')),
  infracredit_reference text,
  mandate_date date,
  guarantee_type text check (guarantee_type in ('CREDIT_GUARANTEE', 'CFBF_CO_FINANCE', 'BOTH', 'NONE')),
  guarantee_amount_ngn numeric,
  guarantee_tenor_years integer,
  infracredit_contact_name text,
  infracredit_contact_email text,
  dreef_notes text,
  last_updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_infracredit_dreef_stage on infracredit_relationships (dreef_stage);

alter table infracredit_relationships enable row level security;
create policy "cef_users_read_infracredit" on infracredit_relationships for select using (public.is_cef_user());
