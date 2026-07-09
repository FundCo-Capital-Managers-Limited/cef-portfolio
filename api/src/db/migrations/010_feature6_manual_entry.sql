-- Feature 6 (Mid-Sprint Change Spec): Manual Data Entry for AssetCos Without Apps.
--
-- Manual entry doesn't call the Event Ingestion API — it goes through
-- dedicated internal Express routes (verifySupabaseAuth, not HMAC) that
-- construct the same CIS-shaped payload the API path would have received,
-- insert an events row with source='MANUAL_ENTRY', and dispatch through the
-- same eventProcessor used by real webhooks. That's what "identical
-- downstream processing regardless of source" (spec §8.3) means in practice
-- here — same handler code path, different entry point.

alter table events add column if not exists source text not null default 'API'
  check (source in ('API', 'MANUAL_ENTRY'));

alter table assets add column if not exists data_source text not null default 'API'
  check (data_source in ('API', 'MANUAL', 'SEED'));
alter table customers add column if not exists data_source text not null default 'API'
  check (data_source in ('API', 'MANUAL', 'SEED'));
alter table payments add column if not exists data_source text not null default 'API'
  check (data_source in ('API', 'MANUAL'));
alter table payments add column if not exists entered_by uuid references users(id);
