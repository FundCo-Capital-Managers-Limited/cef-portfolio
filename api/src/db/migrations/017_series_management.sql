-- Feature follow-up: CEF Series (A, B, C, ...) needs to be creatable/deletable
-- by CEF Management/IT Admin as new fundraising rounds open, not fixed to the
-- four values hardcoded in migration 007. That check constraint blocked
-- creating a real "Series D" at the database level regardless of what the
-- API/UI allowed.

alter table cef_series drop constraint if exists cef_series_code_check;
alter table cef_series add constraint cef_series_code_check check (code ~ '^[A-Z][A-Z0-9_]*$');
