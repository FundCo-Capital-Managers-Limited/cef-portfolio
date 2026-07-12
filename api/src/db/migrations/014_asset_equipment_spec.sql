-- Phase 1 UX follow-up: named equipment details for an asset (e.g. "100kWp
-- Solar Panel Array", "125kWh Lithium Battery Bank") beyond the OEM
-- model/manufacturer already captured (migration 008). Free text, not a
-- structured capacity value/unit pair — matches the earlier decision to keep
-- asset_type free text rather than an enum, since units and naming vary too
-- much across solar/mini-grid/EV to normalize cleanly right now.

alter table assets add column if not exists equipment_spec text;
