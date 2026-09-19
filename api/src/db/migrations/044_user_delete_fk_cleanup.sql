-- Fixes DELETE /api/users/:id, which currently fails on the very first user
-- who has ever done anything beyond sign in:
--   "update or delete on table \"users\" violates foreign key constraint
--   \"notification_cursors_user_id_fkey\" on table \"notification_cursors\""
--
-- userService.deleteUser's own comment only reasoned through audit_log's FK
-- (fixed in 018 with `on delete set null`) — every other table referencing
-- users(id) was left on Postgres's default NO ACTION/RESTRICT, so
-- notification_cursors is just the first of ~30 tables that would each throw
-- the same error in turn. Two groups, treated differently:
--
-- 1) Ephemeral per-user state, worth zero once the account is gone —
--    notification_cursors is the only one of these still missing a cascade
--    (user_assetco_dev_access, flag_views, notification_recipients already
--    got `on delete cascade` in 015/021).
-- 2) Historical "who did/decided/created/owns X" columns — real IC/credit
--    record-keeping that must survive the account's deletion. Every one of
--    these already has a denormalized *_email/*_by_email column alongside
--    it (matters/documents/decisions/etc. all follow the pattern audit_log
--    established in 018), so `on delete set null` here loses no
--    information — same treatment as audit_log.actor_user_id,
--    flags.created_by_user_id, and approval_requests.requested_by_user_id
--    already got.
--
-- Deliberately NOT touched: ic_committee_members.user_id,
-- ic_conflict_declarations.user_id, ic_votes.user_id. All three are
-- `not null` with no denormalized email fallback — nulling them would
-- either be impossible (not null) or silently erase who sat on the
-- committee/cast a vote, which is exactly the kind of governance history
-- this platform exists to keep intact. These stay on the default RESTRICT:
-- deleting a user with committee/vote history should keep failing, loudly,
-- rather than corrupting that record — userService.deleteUser now catches
-- this specific case and returns a clear "use Suspend instead" error
-- instead of a raw Postgres constraint message.

alter table notification_cursors drop constraint if exists notification_cursors_user_id_fkey;
alter table notification_cursors add constraint notification_cursors_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;

alter table assetcos drop constraint if exists assetcos_stage_updated_by_fkey;
alter table assetcos add constraint assetcos_stage_updated_by_fkey
  foreign key (stage_updated_by) references users(id) on delete set null;

alter table assetco_stage_log drop constraint if exists assetco_stage_log_changed_by_fkey;
alter table assetco_stage_log add constraint assetco_stage_log_changed_by_fkey
  foreign key (changed_by) references users(id) on delete set null;

alter table infracredit_relationships drop constraint if exists infracredit_relationships_last_updated_by_fkey;
alter table infracredit_relationships add constraint infracredit_relationships_last_updated_by_fkey
  foreign key (last_updated_by) references users(id) on delete set null;

alter table customer_stage_log drop constraint if exists customer_stage_log_changed_by_fkey;
alter table customer_stage_log add constraint customer_stage_log_changed_by_fkey
  foreign key (changed_by) references users(id) on delete set null;

alter table payments drop constraint if exists payments_entered_by_fkey;
alter table payments add constraint payments_entered_by_fkey
  foreign key (entered_by) references users(id) on delete set null;

alter table cef_facilities drop constraint if exists cef_facilities_created_by_fkey;
alter table cef_facilities add constraint cef_facilities_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table cef_facilities drop constraint if exists cef_facilities_classification_override_by_fkey;
alter table cef_facilities add constraint cef_facilities_classification_override_by_fkey
  foreign key (classification_override_by) references users(id) on delete set null;

alter table cef_facility_repayments drop constraint if exists cef_facility_repayments_recorded_by_fkey;
alter table cef_facility_repayments add constraint cef_facility_repayments_recorded_by_fkey
  foreign key (recorded_by) references users(id) on delete set null;

alter table assetco_applications drop constraint if exists assetco_applications_reviewed_by_fkey;
alter table assetco_applications add constraint assetco_applications_reviewed_by_fkey
  foreign key (reviewed_by) references users(id) on delete set null;

alter table ic_matters drop constraint if exists ic_matters_deal_lead_user_id_fkey;
alter table ic_matters add constraint ic_matters_deal_lead_user_id_fkey
  foreign key (deal_lead_user_id) references users(id) on delete set null;

alter table ic_matters drop constraint if exists ic_matters_created_by_user_id_fkey;
alter table ic_matters add constraint ic_matters_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table ic_documents drop constraint if exists ic_documents_confirmed_by_user_id_fkey;
alter table ic_documents add constraint ic_documents_confirmed_by_user_id_fkey
  foreign key (confirmed_by_user_id) references users(id) on delete set null;

alter table ic_documents drop constraint if exists ic_documents_created_by_user_id_fkey;
alter table ic_documents add constraint ic_documents_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table ic_meetings drop constraint if exists ic_meetings_chair_user_id_fkey;
alter table ic_meetings add constraint ic_meetings_chair_user_id_fkey
  foreign key (chair_user_id) references users(id) on delete set null;

alter table ic_meetings drop constraint if exists ic_meetings_secretary_user_id_fkey;
alter table ic_meetings add constraint ic_meetings_secretary_user_id_fkey
  foreign key (secretary_user_id) references users(id) on delete set null;

alter table ic_meetings drop constraint if exists ic_meetings_created_by_user_id_fkey;
alter table ic_meetings add constraint ic_meetings_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table ic_decisions drop constraint if exists ic_decisions_decided_by_user_id_fkey;
alter table ic_decisions add constraint ic_decisions_decided_by_user_id_fkey
  foreign key (decided_by_user_id) references users(id) on delete set null;

alter table ic_conditions drop constraint if exists ic_conditions_owner_user_id_fkey;
alter table ic_conditions add constraint ic_conditions_owner_user_id_fkey
  foreign key (owner_user_id) references users(id) on delete set null;

alter table ic_conditions drop constraint if exists ic_conditions_created_by_user_id_fkey;
alter table ic_conditions add constraint ic_conditions_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table ic_minutes drop constraint if exists ic_minutes_drafted_by_user_id_fkey;
alter table ic_minutes add constraint ic_minutes_drafted_by_user_id_fkey
  foreign key (drafted_by_user_id) references users(id) on delete set null;

alter table ic_minutes drop constraint if exists ic_minutes_locked_by_user_id_fkey;
alter table ic_minutes add constraint ic_minutes_locked_by_user_id_fkey
  foreign key (locked_by_user_id) references users(id) on delete set null;

alter table ic_emails drop constraint if exists ic_emails_sender_user_id_fkey;
alter table ic_emails add constraint ic_emails_sender_user_id_fkey
  foreign key (sender_user_id) references users(id) on delete set null;

alter table facility_documents drop constraint if exists facility_documents_confirmed_by_user_id_fkey;
alter table facility_documents add constraint facility_documents_confirmed_by_user_id_fkey
  foreign key (confirmed_by_user_id) references users(id) on delete set null;

alter table facility_documents drop constraint if exists facility_documents_created_by_user_id_fkey;
alter table facility_documents add constraint facility_documents_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table facility_security drop constraint if exists facility_security_created_by_user_id_fkey;
alter table facility_security add constraint facility_security_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table facility_covenants drop constraint if exists facility_covenants_created_by_user_id_fkey;
alter table facility_covenants add constraint facility_covenants_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table facility_repayment_notifications drop constraint if exists facility_repayment_notifications_submitted_by_user_id_fkey;
alter table facility_repayment_notifications add constraint facility_repayment_notifications_submitted_by_user_id_fkey
  foreign key (submitted_by_user_id) references users(id) on delete set null;

alter table facility_repayment_notifications drop constraint if exists facility_repayment_notifications_confirmed_by_user_id_fkey;
alter table facility_repayment_notifications add constraint facility_repayment_notifications_confirmed_by_user_id_fkey
  foreign key (confirmed_by_user_id) references users(id) on delete set null;

alter table facility_milestones drop constraint if exists facility_milestones_created_by_user_id_fkey;
alter table facility_milestones add constraint facility_milestones_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table facility_checklist_items drop constraint if exists facility_checklist_items_completed_by_user_id_fkey;
alter table facility_checklist_items add constraint facility_checklist_items_completed_by_user_id_fkey
  foreign key (completed_by_user_id) references users(id) on delete set null;

alter table facility_checklist_items drop constraint if exists facility_checklist_items_created_by_user_id_fkey;
alter table facility_checklist_items add constraint facility_checklist_items_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete set null;

alter table ic_matter_comments drop constraint if exists ic_matter_comments_author_user_id_fkey;
alter table ic_matter_comments add constraint ic_matter_comments_author_user_id_fkey
  foreign key (author_user_id) references users(id) on delete set null;
