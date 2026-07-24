-- IC Engagement Portal, Milestone 1: the capability gate that decides who can
-- even reach /engagement. management/executive/it_admin get access
-- automatically (checked in app code against their role, not stored here —
-- see dashboard/lib/icAccess.js — so it stays correct if role logic changes
-- without a backfill); can_access_ic is for granting access to anyone else
-- (e.g. a finance/risk/ops person who's also an IC member) without changing
-- their PIP role or write permissions.

alter table users add column if not exists can_access_ic boolean not null default false;
