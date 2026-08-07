-- Delegated-authority + trustee no-objection tracking (Abiodun's ask,
-- 2026-08-05 walkthrough): "all the disbursements done today based on
-- approval both at committee and at delegated authority — have we got no
-- objection from the trustee" — status of both should be visible on the
-- matter without digging through minutes. Fixed 3-state enums (unlike the
-- free-text narrative fields elsewhere in this codebase) since these really
-- are fixed states, not narrative phrases that would lose meaning if forced
-- into a closed set.

alter table ic_matters add column if not exists delegated_authority_status text not null default 'NOT_REQUIRED'
  check (delegated_authority_status in ('NOT_REQUIRED', 'PENDING', 'GRANTED'));
alter table ic_matters add column if not exists trustee_no_objection_status text not null default 'NOT_REQUIRED'
  check (trustee_no_objection_status in ('NOT_REQUIRED', 'PENDING', 'RECEIVED'));
