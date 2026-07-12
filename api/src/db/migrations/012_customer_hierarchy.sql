-- Corrects the dashboard hierarchy: assets belong to customers, and the
-- AssetCo view should be customer-first (name, asset type, deal type,
-- project value), not asset-first. ownership_model already exists on assets
-- as the "deal type" (OUTRIGHT_PURCHASE | LEASE_TO_OWN | PAYG_METERED —
-- relabelled "Energy as a Service" in the UI only, no schema change).
--
-- asset_type is free text, not an enum — AssetCos work with varied hardware
-- (solar systems, mini-grid connections, EV bikes, meters, battery-swap
-- stations, ...) and we deliberately don't want to hardcode an exhaustive
-- list. AssetCos declare the *categories* they work with on their profile
-- (assetcos.asset_types, Feature 1); individual assets just tag which one
-- they are.

alter table assets add column if not exists asset_type text;
