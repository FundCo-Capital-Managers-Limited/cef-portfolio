-- Discretionary facility classification (Credit Monitoring Framework,
-- Oluseyi's ask on the 2026-08-05 walkthrough): facility_status stays the
-- automatic, KRI-derived classification (recomputed by recordRepayment/
-- checkFacilityArrears in facilityService.js) — untouched by this. Management
-- can layer a discretionary override on top with a reason, e.g. "aware of a
-- one-off delay, treat as performing" despite a raw missed-payment signal.
-- The override is a distinct field so the automatic recompute never silently
-- clobbers a deliberate management call, and the audit trail (who overrode,
-- when, why) survives even after the override is later cleared.

alter table cef_facilities
  add column if not exists classification_override text,
  add column if not exists classification_override_reason text,
  add column if not exists classification_override_by uuid references users(id),
  add column if not exists classification_override_at timestamptz;
