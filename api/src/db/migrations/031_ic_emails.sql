-- IC Engagement Portal, Milestone 8: outbound email. Sent from the already-
-- verified updates.fundco.ng domain (not a new ic.cleanenergyfund.ng domain -
-- Resend's free plan only allows one verified sending domain, and the team
-- isn't upgrading yet) with the sender's own name as the display name.
-- to_emails/cc_emails are arrays since a compose can have multiple
-- recipients/CCs - the sender themselves is always CC'd and set as
-- reply-to (see icEmailService.js) so a reply from the recipient lands in
-- the sender's own mailbox, not a shared address nobody's watching.

create table if not exists ic_emails (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references ic_matters(id),
  sender_user_id uuid references users(id),
  sender_email text not null,
  sender_name text,
  to_emails text[] not null,
  cc_emails text[] not null default '{}',
  subject text not null,
  body text not null,
  resend_message_id text,
  send_error text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_ic_emails_matter on ic_emails (matter_id);
create index if not exists idx_ic_emails_sender on ic_emails (sender_user_id);

alter table ic_emails enable row level security;

create policy "ic_users_read_emails" on ic_emails for select using (public.current_user_can_access_ic());
create policy "ic_users_insert_emails" on ic_emails for insert with check (public.current_user_can_access_ic());
