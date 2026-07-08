-- Feature 1 (Mid-Sprint Change Spec): AssetCo Onboarding & Pipeline Flow.
--
-- Extends the existing `assetcos` table (spec calls it `asset_cos` — kept our
-- existing name since every FK in this repo already points at `assetcos`).
-- Two fields from the spec are intentionally NOT added: api_key_hash and
-- hmac_secret_hash. HMAC verification (verifyHmac.js) must recompute the
-- signature server-side using the raw secret — hashing it would make that
-- impossible. The existing plaintext `hmac_secret` column already serves
-- this purpose; hashing is a password-style pattern that doesn't apply here.

alter table assetcos add column if not exists legal_entity_name text;
alter table assetcos add column if not exists registration_number text;
alter table assetcos add column if not exists website text;
alter table assetcos add column if not exists pipeline_stage text not null default 'ONBOARDING'
  check (pipeline_stage in ('ONBOARDING', 'DUE_DILIGENCE', 'IC_APPROVAL', 'DISBURSEMENT', 'PORTFOLIO_MONITORING'));
alter table assetcos add column if not exists asset_types text[];
alter table assetcos add column if not exists customer_types text[];
alter table assetcos add column if not exists sector text
  check (sector in ('SOLAR', 'MINI_GRID', 'EV_MOBILITY', 'BATTERY_STORAGE', 'OTHER'));
alter table assetcos add column if not exists business_description text;
alter table assetcos add column if not exists hq_state text;
alter table assetcos add column if not exists operating_states text[];
alter table assetcos add column if not exists primary_contact_name text;
alter table assetcos add column if not exists primary_contact_email text;
alter table assetcos add column if not exists primary_contact_phone text;
alter table assetcos add column if not exists logo_url text;
alter table assetcos add column if not exists integration_type text not null default 'API'
  check (integration_type in ('API', 'MANUAL', 'HYBRID'));
alter table assetcos add column if not exists stage_updated_at timestamptz;
alter table assetcos add column if not exists stage_updated_by uuid references users(id);
alter table assetcos add column if not exists internal_notes text;

create table if not exists assetco_stage_log (
  id uuid primary key default gen_random_uuid(),
  assetco_id text not null references assetcos(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references users(id),
  changed_by_name text,
  changed_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_assetco_stage_log_assetco on assetco_stage_log (assetco_id, changed_at desc);

alter table assetco_stage_log enable row level security;
create policy "cef_users_read_assetco_stage_log" on assetco_stage_log for select using (public.is_cef_user());
