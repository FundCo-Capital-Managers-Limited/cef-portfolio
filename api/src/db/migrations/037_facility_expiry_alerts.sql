-- Credit-risk backlog item: expiry-aware alerts. Documents/security/covenants
-- had status fields but nothing that proactively flags "this is about to
-- lapse" — someone had to notice manually. Adds explicit, machine-checkable
-- dates alongside the existing narrative fields (insurance_status/frequency
-- stay free text per the "simplify without losing meaning" principle — these
-- new date columns are additive, not a replacement for the narrative ones).

alter table facility_documents add column if not exists expiry_date date;
alter table facility_security add column if not exists insurance_expiry_date date;
alter table facility_covenants add column if not exists next_test_due_date date;

-- Widen alerts for the three new expiry alert types, and add reference
-- columns so the nightly check can avoid re-alerting on the same expiry
-- every night (same dedupe pattern as facility_id/schedule_id in migration 011).
alter table alerts drop constraint if exists alerts_alert_type_check;
alter table alerts add constraint alerts_alert_type_check check (alert_type in (
  'payment.defaulted', 'asset.fault.detected',
  'CEF_FACILITY_REPAYMENT_MISSED', 'CEF_FACILITY_7_DAYS_OVERDUE', 'CEF_FACILITY_APPROACHING_MATURITY',
  'FACILITY_DOCUMENT_EXPIRING', 'FACILITY_DOCUMENT_EXPIRED',
  'FACILITY_SECURITY_INSURANCE_EXPIRING', 'FACILITY_SECURITY_INSURANCE_EXPIRED',
  'FACILITY_COVENANT_TEST_DUE', 'FACILITY_COVENANT_TEST_OVERDUE'
));
alter table alerts add column if not exists facility_document_id uuid references facility_documents(id);
alter table alerts add column if not exists facility_security_id uuid references facility_security(id);
alter table alerts add column if not exists facility_covenant_id uuid references facility_covenants(id);
