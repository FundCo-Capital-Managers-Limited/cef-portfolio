-- Onboarding/gap-diagnostic checklist (Abiodun + Ade, 2026-08-05 walkthrough):
-- "tie the checklist to business models, not individual AssetCos" (one
-- AssetCo can run more than one business model), mirroring the kind of
-- requirements DREEF/InfraCredit's own onboarding checklists carry, and
-- covering the credit-risk track's own gap-diagnostic ask (documents/
-- security/covenants completeness at facility intake) in the same feature.
--
-- No separate template table — DEFAULT_CHECKLIST_ITEMS in facilityEnums.js
-- is a static, high-level starting set per business model; applying it
-- copies those labels into rows here so a later change to the defaults
-- never silently rewrites a facility's already-applied checklist. Ad hoc
-- items can still be added per facility.

create table if not exists facility_checklist_items (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references cef_facilities(id) on delete cascade,
  assetco_id text not null references assetcos(id),
  business_model text,
  label text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'DONE', 'NOT_APPLICABLE')),
  notes text,
  completed_by_user_id uuid references users(id),
  completed_by_email text,
  completed_at timestamptz,
  created_by_user_id uuid references users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_facility_checklist_items_facility on facility_checklist_items (facility_id);
create index if not exists idx_facility_checklist_items_assetco on facility_checklist_items (assetco_id);

alter table facility_checklist_items enable row level security;

create policy "role_scoped_read_facility_checklist_items" on facility_checklist_items for select using (
  case public.current_user_role()
    when 'assetco_admin' then assetco_id = public.current_user_assetco_id()
    when 'assetco_dev' then assetco_id = any(public.current_user_dev_assetco_ids())
    else public.is_cef_user()
  end
);
