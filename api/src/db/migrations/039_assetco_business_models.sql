-- Business-model categorization on the AssetCo Registry (Ade's ask,
-- 2026-08-05 walkthrough) — additive alongside the existing asset_types/
-- customer_types free-text arrays, not a replacement for them or a change to
-- the underlying Asset Registry. Free text (like its siblings), not a fixed
-- enum, since one AssetCo can run more than one business model (e.g. EML
-- doing both C&I and C2C) and CEF's own terminology for these may evolve —
-- the facility-level checklist (migration 038) already has its own fixed
-- BUSINESS_MODELS list for a different job (picking a default checklist).

alter table assetco_applications add column if not exists business_models text[];
alter table assetcos add column if not exists business_models text[];

-- Re-expose through the secrets-excluding view (migration 016) — recreated
-- in full since Postgres requires the whole column list on CREATE OR REPLACE
-- VIEW. New column has to go LAST in the select list — Postgres only allows
-- CREATE OR REPLACE VIEW to append columns, not insert one in the middle of
-- the existing list (every column after the insertion point would count as
-- a rename, which it rejects).
create or replace view public.assetcos_public
with (security_invoker = true) as
select
  id, name, is_active, created_at, base_url, legal_entity_name, registration_number, website,
  pipeline_stage, asset_types, customer_types, sector, business_description, hq_state, operating_states,
  primary_contact_name, primary_contact_email, primary_contact_phone, logo_url, integration_type,
  stage_updated_at, stage_updated_by, internal_notes, business_models
from public.assetcos;
