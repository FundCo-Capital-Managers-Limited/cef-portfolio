-- Workstream H: Public AssetCo Onboarding Form + Review Queue.
--
-- Prospective AssetCos self-register via a public, unauthenticated form
-- (/apply). Submissions land here as a review queue, NOT directly as live
-- `assetcos` rows — per instruction, this keeps a bad-faith or duplicate
-- submission from ever touching the real pipeline until a CEF reviewer
-- (IT/management/executive) approves it. Approval promotes the application
-- into a real `assetcos` row at pipeline_stage = 'ONBOARDING'; rejection just
-- leaves the record here for the audit trail.
--
-- No RLS read policy for "any CEF user" (unlike most other tables) —
-- application review is restricted to a narrower set of roles than the
-- general is_cef_user() check allows, so all reads/writes go through the
-- backend API (secret-key client) rather than direct Supabase queries from
-- the dashboard.

create table if not exists assetco_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  legal_entity_name text,
  registration_number text,
  website text,
  sector text check (sector in ('SOLAR', 'MINI_GRID', 'EV_MOBILITY', 'BATTERY_STORAGE', 'OTHER')),
  business_description text,
  hq_state text,
  operating_states text[],
  asset_types text[],
  customer_types text[],
  primary_contact_name text not null,
  primary_contact_email text not null,
  primary_contact_phone text,
  status text not null default 'PENDING' check (status in ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  review_notes text,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  promoted_assetco_id text references assetcos(id),
  submitted_at timestamptz not null default now()
);

create index if not exists idx_assetco_applications_status on assetco_applications (status, submitted_at desc);

alter table assetco_applications enable row level security;
-- Intentionally no select/insert policies: all access goes through the
-- backend's secret-key client (public submissions and admin review alike).
