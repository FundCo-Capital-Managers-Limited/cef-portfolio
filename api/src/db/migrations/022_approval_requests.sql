-- Management-approval workflow, scoped to CEF Series mutations only for now
-- (create/edit/delete) - the one concrete example given when this was
-- raised. See documents/PHASE_2_ROADMAP.md for the fuller design note and
-- why this starts narrow rather than covering every financial write.
--
-- Finance/Risk submitting a series change now creates a pending request
-- instead of applying immediately; management/it_admin can approve (which
-- applies the underlying mutation) or reject. Management/it_admin's own
-- series writes stay immediate - they're the approval authority, so
-- routing their own actions through their own queue would be circular.

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (action_type in ('SERIES_CREATE', 'SERIES_UPDATE', 'SERIES_DELETE')),
  target_series_id uuid references cef_series(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by_user_id uuid references users(id) on delete set null,
  requested_by_email text not null,
  decided_by_email text,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_approval_requests_status on approval_requests (status);

alter table approval_requests enable row level security;

-- management/it_admin see the full queue (they're the approvers); everyone
-- else sees only the status of requests they personally submitted.
create policy "approval_requests_read" on approval_requests for select using (
  case
    when public.current_user_role() in ('management', 'it_admin') then true
    else requested_by_user_id in (select id from public.users where auth_user_id = auth.uid())
  end
);
