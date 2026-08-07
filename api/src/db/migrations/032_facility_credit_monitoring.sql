-- Credit Risk track: extends the existing CEF Loan Book (cef_facilities,
-- Feature 7) with the registers from the Credit Monitoring Framework that
-- don't already exist. Repayment monitoring itself needs nothing new -
-- cef_facility_repayments/cef_facility_schedule already are that register.
-- Exception/gap tracking reuses the existing Flags feature (entityType
-- 'cef_facility') rather than a new table. This migration only adds what's
-- genuinely missing: document completeness, security/collateral, and
-- covenants - plus the repayment-notification workflow described below.
--
-- perfection_status/insurance_status/frequency are left as free text rather
-- than rigid enums: the framework's own real-world values are narrative
-- ("Pending Upstamping", "Sighted Asset Policy - Needs Renewal Log") not
-- fixed codes, and forcing them into a closed enum would lose meaning for
-- the sake of tidiness. compliance_status is the one place a simplified
-- 3-state enum still captures the essential meaning without the excess
-- narrative granularity of the framework's own phrasing.

create table if not exists facility_documents (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete cascade,
  title text not null,
  classification text not null,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EXECUTED', 'SUPERSEDED', 'EXPIRED', 'ARCHIVED'
  )),
  sharepoint_url text,
  confirmed_by_user_id uuid references users(id),
  confirmed_by_email text,
  confirmed_at timestamptz,
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists facility_security (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete cascade,
  security_type text not null,
  value_ngn numeric,
  perfection_status text,
  insurance_status text,
  notes text,
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists facility_covenants (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete cascade,
  covenant_description text not null,
  covenant_type text not null check (covenant_type in ('FINANCIAL', 'REPORTING', 'OPERATIONAL', 'NEGATIVE')),
  frequency text,
  compliance_status text not null default 'PENDING' check (compliance_status in ('COMPLIANT', 'NON_COMPLIANT', 'PENDING')),
  last_tested_date date,
  notes text,
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AssetCos repay CEF by bank transfer, not through the platform - they
-- notify CEF of a payment, and finance/risk/portfolio staff record the
-- actual repayment after confirming it (see facilityController.recordRepayment,
-- now CEF-staff-only). This table is that notification: it never writes to
-- cef_facility_repayments directly - confirming one calls the existing
-- facilityService.recordRepayment and links the result here.
create table if not exists facility_repayment_notifications (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete cascade,
  assetco_id text not null references assetcos(id),
  amount_ngn numeric not null,
  payment_date date not null,
  payment_reference text,
  period_covered text,
  notes text,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'REJECTED')),
  submitted_by_user_id uuid references users(id),
  submitted_by_email text,
  confirmed_by_user_id uuid references users(id),
  confirmed_by_email text,
  confirmed_at timestamptz,
  rejection_reason text,
  resulting_repayment_id uuid references cef_facility_repayments(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_facility_documents_facility on facility_documents (facility_id);
create index if not exists idx_facility_security_facility on facility_security (facility_id);
create index if not exists idx_facility_covenants_facility on facility_covenants (facility_id);
create index if not exists idx_facility_repayment_notifications_facility on facility_repayment_notifications (facility_id);
create index if not exists idx_facility_repayment_notifications_status on facility_repayment_notifications (status);

alter table facility_documents enable row level security;
alter table facility_security enable row level security;
alter table facility_covenants enable row level security;
alter table facility_repayment_notifications enable row level security;

-- Matches the existing simple is_cef_user()-broad pattern already used for
-- cef_facilities/cef_facility_repayments/cef_facility_schedule (these tables
-- predate the per-role RLS scoping added in migration 016) - real
-- authorization lives in the Express layer (canManageAssetco/canAccessAssetco
-- and the CEF-staff-only checks in facilityController.js), same as those
-- existing tables.
create policy "cef_users_read_facility_documents" on facility_documents for select using (public.is_cef_user());
create policy "cef_users_write_facility_documents" on facility_documents for insert with check (public.is_cef_user());
create policy "cef_users_update_facility_documents" on facility_documents for update using (public.is_cef_user());

create policy "cef_users_read_facility_security" on facility_security for select using (public.is_cef_user());
create policy "cef_users_write_facility_security" on facility_security for insert with check (public.is_cef_user());
create policy "cef_users_update_facility_security" on facility_security for update using (public.is_cef_user());

create policy "cef_users_read_facility_covenants" on facility_covenants for select using (public.is_cef_user());
create policy "cef_users_write_facility_covenants" on facility_covenants for insert with check (public.is_cef_user());
create policy "cef_users_update_facility_covenants" on facility_covenants for update using (public.is_cef_user());

create policy "cef_users_read_facility_repayment_notifications" on facility_repayment_notifications for select using (public.is_cef_user());
create policy "cef_users_write_facility_repayment_notifications" on facility_repayment_notifications for insert with check (public.is_cef_user());
create policy "cef_users_update_facility_repayment_notifications" on facility_repayment_notifications for update using (public.is_cef_user());
