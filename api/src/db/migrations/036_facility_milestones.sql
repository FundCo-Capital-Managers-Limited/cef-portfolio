-- Milestone tracking for project-development facilities (Abiodun's EML
-- example, 2026-08-05 walkthrough): some facilities are disbursed well
-- before repayment starts, and tracking only the repayment schedule misses
-- the real value delivered during that gap — e.g. EML hadn't repaid anything
-- in 24 months but had been steadily hitting construction/deployment
-- milestones the whole time. This is a separate register from
-- cef_facility_schedule (which stays purely about repayment).
--
-- evidence_url follows the same SharePoint-reference pattern as
-- facility_documents/ic_documents — no file storage in the app.
--
-- Built with role-scoped RLS from the start (assetco_id column, same shape
-- as migration 034), not the older is_cef_user()-broad pattern those tables
-- used before being fixed.

create table if not exists facility_milestones (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete cascade,
  assetco_id text not null references assetcos(id),
  title text not null,
  description text,
  target_date date,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED')),
  completed_date date,
  evidence_url text,
  notes text,
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_facility_milestones_facility on facility_milestones (facility_id);
create index if not exists idx_facility_milestones_assetco on facility_milestones (assetco_id);

alter table facility_milestones enable row level security;

create policy "role_scoped_read_facility_milestones" on facility_milestones for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);
