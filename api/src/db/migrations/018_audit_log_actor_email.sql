-- Denormalize the actor's email onto audit_log at write time, rather than
-- relying solely on the actor_user_id -> users join.
--
-- Two reasons this matters now specifically:
-- 1. The dashboard is about to gain a "delete user" feature. FK constraints
--    on actor_user_id would otherwise block deleting any user who has ever
--    made a change (nearly everyone), or silently erase who-did-what if the
--    constraint were ON DELETE CASCADE instead. Storing the email directly
--    means audit history survives the actor's account being deleted later —
--    exactly the "so we can contact them if there's an issue" requirement.
-- 2. It's not really 2 vs 1 either — it's what the audit trail is *for*.

alter table audit_log add column if not exists actor_email text;

update audit_log al
set actor_email = u.email
from users u
where al.actor_user_id = u.id
  and al.actor_email is null;

alter table audit_log drop constraint if exists audit_log_actor_user_id_fkey;
alter table audit_log add constraint audit_log_actor_user_id_fkey
  foreign key (actor_user_id) references users(id) on delete set null;
