# CEF-PIP — Phase 2 Roadmap

Everything below is deferred, not forgotten. This is the single place to check before assuming
something still needs doing — update it as items land or new ones come up, the same way the MVP
plan and mid-sprint change spec drove Phase 1.

## Immediate loose ends (should close soon, not really "Phase 2")

- [ ] Confirm `cef-pip-dev`'s Supabase Auth **Site URL / Redirect URLs** are set correctly (see
  `ENVIRONMENTS.md` §2) — `cef-pip-prod` had this gap and it silently broke password reset links;
  dev was never explicitly checked.
- [ ] Confirm the DMARC record (`v=DMARC1; p=none; rua=mailto:it@fundco.ng` at
  `_dmarc.updates.fundco.ng`) is in place — this was recommended after the Outlook quarantine issue
  but add a checkmark here once it's actually live and propagated.

## Nice to have — before Phase 2 (raised 2026-07-12, not yet scoped/built)

**Management approval workflow for key mutations, with email notifications.** Raised by the user as
a "nice to have" for next convergence, not yet designed in detail. Captured here so the shape of the
ask survives to the next session:

- Certain mutations (explicit example given: **CEF Series modifications** — exact full list of
  which actions require approval is still open; needs deciding when this is picked up) should not
  take effect immediately. Instead they go into a **pending/awaiting-approval** state and only
  actually apply once a management-level person approves them.
- A dedicated **Approvals page**, linked from the navbar:
  - Visible to **management and it_admin** (user explicitly said "make it possible for the IT
    people to be able to approve as well") — they see the queue of pending requests and can
    approve/reject.
  - Visible to **everyone else** too, but scoped to their own submissions — they can see the status
    of requests they personally raised (pending / approved / rejected), not the full queue.
- **Email notifications**, using the already-working Resend integration:
  - Management/it_admin get an email when a new approval request is raised (so it doesn't just sit
    silently in a queue nobody checks).
  - The requester gets an email once their request is approved (presumably also on rejection,
    though the user didn't explicitly say — worth confirming).
- **Executive role**: confirmed by the user that executives should be able to **view** almost
  everything (consistent with today's `CEF_WIDE_ROLES` read access), but **must go through the same
  approval flow to modify anything** — i.e. executive is not exempt from approval-gating just
  because it's a senior/read-heavy role today.

Design considerations for whoever picks this up: this is a genuine "change request" pattern, not
just a stricter audit log — it likely needs a staging/pending-change table (or a status column on
whatever's being changed) separate from `audit_log`, since the mutation must NOT apply until
approved. Reuse the existing audit_log actor_email pattern for "who requested / who approved."
Decide the exact list of approval-gated actions before building — "CEF Series modifications" was
the one concrete example given, not necessarily the only one intended.

## Feature work

- **Email notifications for important updates.** Today, everything in `audit_log` only surfaces
  in-app (the notification bell). Resend is already wired up and proven working (alerts,
  password reset) — extending it to email digest/real-time notifications for specific event types
  (defaults, faults, stage changes, series/facility edits) is a well-scoped next feature, not a
  rebuild.
- **Per-role RLS scoping beyond assetco_admin/assetco_dev.** Migration 016 scoped rows by role for
  AssetCo-facing roles; CEF-internal roles (finance/ops/executive/management/it_admin) still all
  share the same `is_cef_user()`-broad read access to every table. Worth revisiting once there's a
  concrete reason to partition CEF-internal data access (e.g. finance-only views), per the original
  architecture doc's Section 12 partitioning plan.
- **OpenAPI/Swagger spec for the Event Ingestion API.** Discussed 2026-07-12 — see the "OpenAPI"
  note in chat/memory for the tradeoffs; worth doing once the event schema stabilizes further, since
  a spec that's out of sync with `eventSchema.js` is worse than no spec.

## Explicitly deferred per the original architecture doc (Section-numbered items, not urgent)

- **Entra ID SSO** — replacing Supabase Auth's email/password with CEF's own Entra ID tenant.
- **Compliance engine** — the architecture doc's automated compliance-rule checking layer.
- **Remote control actions** — `asset.disabled`/`asset.enabled`/`telemetry.updated`/`rider.inactive`
  event types are already accepted and durably stored (`api/src/utils/eventSchema.js`), but CEF-PIP
  doesn't act on them yet. The dashboard's Remote Control panel on the asset detail page already
  has inert placeholder buttons for this (`[assetco]/assets/[assetId]/page.js`).
- **2nd/3rd AssetCo onboarding** — the pipeline/sandbox/dev-console tooling all supports this
  today; this item is really "actually go do it," not "build more first."

## How to use this document

When picking up any of these, verify current state first (grep the codebase, check migrations
applied) rather than assuming this list is still accurate — it's a snapshot from 2026-07-12, not a
live status board.
