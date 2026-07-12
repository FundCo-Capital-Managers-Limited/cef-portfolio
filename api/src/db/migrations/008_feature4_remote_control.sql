-- Feature 4 (Mid-Sprint Change Spec): Remote Control Capability Flag per Asset.
--
-- Not all OEM hardware supports remote disable/enable — e.g. some Itel
-- inverters (GroSolar) require physical access, while TankVolt EV bikes
-- (SSM) support it via the OEM's own API. Captured per-asset (not per-
-- AssetCo) since one AssetCo may deploy multiple OEM models.
--
-- remote_control_supported: TRUE only if the OEM hardware supports it AND
--   CEF-PIP's integration for it has actually been built — see UI note below.
-- oem_remote_control_api_available: whether the OEM hardware could support it
--   in principle, independent of whether the integration exists yet.
--
-- Actually executing a disable/enable command (dual-approval flow, calling
-- into the AssetCo's /cef/control/* endpoints) is explicitly out of MVP
-- scope — deferred to Phase 2 per the original architecture doc and
-- CLAUDE.md. This migration and the conditional UI it enables are flag
-- tracking only; the Disable/Enable buttons render but don't yet act.

alter table assets add column if not exists remote_control_supported boolean not null default false;
alter table assets add column if not exists oem_model text;
alter table assets add column if not exists oem_manufacturer text;
alter table assets add column if not exists oem_remote_control_api_available boolean not null default false;
