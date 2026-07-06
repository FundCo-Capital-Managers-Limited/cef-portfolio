# CEF-PIP — Project Context

## What this is

CEF Portfolio Intelligence Platform (CEF-PIP): a portfolio oversight platform for the Clean Energy
Fund (CEF), which finances independently operated clean-energy companies ("AssetCos") — e.g.
GroSolar (solar financing/installation), EML (mini-grids), SSM (EV bike charging/battery-swap).
CEF-PIP aggregates financial, operational, and telemetry data from AssetCo platforms into one
oversight layer. It does **not** replace AssetCo operational systems or talk to OEM hardware directly
— it only talks to AssetCo platforms, which talk to OEM hardware. AssetCos remain the source of
truth for their own operational data; CEF-PIP owns visibility, governance, and analytics.

Two source documents live in `documents/`:
- `CEF-PIP Solution Architecture Report.docx` — the full target architecture (all phases, all
  AssetCos, Entra ID SSO, compliance engine, control actions, Azure/K8s stack). This is the
  long-term vision, not what we're building right now.
- `CEF-PIP_MVP Implementation Plan.docx` — **the plan actually driving this build**: a 6-week MVP
  scoped to Event Ingestion, Cashflow Engine, Alert Engine, Asset Registry, Reconciliation, one
  dashboard, and one live AssetCo integration by end of Week 6. Simple/free-tier stack (Vercel,
  Render, Supabase, Resend, GitHub Actions) instead of the Azure stack in the architecture doc.

When the two documents conflict, **the MVP plan wins** unless the user says otherwise — we are
deliberately deferring Entra ID SSO, the compliance engine, remote control actions, and 2nd/3rd
AssetCo onboarding to Phase 2.

## Repo layout

Monorepo (decided over two separate repos, for MVP simplicity):
- `api/` — Express backend: Event Ingestion API, Cashflow Engine, Alert Engine, Reconciliation.
  Deploys to Render.
- `dashboard/` — Next.js frontend: Portfolio / AssetCo / Asset dashboards. Deploys to Vercel.
- `documents/` — architecture report, MVP plan, FRD, TRS, RFP, diagrams. Reference only, not code.

Both connect to a Supabase project (Postgres + Auth) — see "Environments" below, there are two
projects, not one. DB schema lives at `api/src/db/migrations/` (applied in numeric order) — this is
the single source of truth for table shapes.

## Environments

`main` → production (`cef-pip-prod` Supabase project, Vercel Production, Render `cef-pip-api`).
`develop` → dev/staging (`cef-pip-dev` Supabase project, Vercel Preview, Render
`cef-pip-api-staging`) — this is what gets demoed to the team and seeded with fake data via
`api/src/db/seed.sql`. Full setup steps are in `ENVIRONMENTS.md`. Never run `seed.sql` against prod.
Automated Jest tests use an in-memory fake Supabase client regardless of branch — no real project
is ever touched in CI.

## How the event pipeline works

1. AssetCo platform POSTs a CEF Integration Standard (CIS) event to `POST /api/v1/events`, signed
   with HMAC-SHA256 over the raw request body using a per-AssetCo secret (`assetcos.hmac_secret`).
2. `verifyHmac` middleware checks the signature before anything else runs.
3. `eventSchema.js` validates the payload shape against the 14 standard event types.
4. The raw event is always stored in `events` first (durable log), regardless of what happens next.
5. `eventProcessor.js` dispatches to a Cashflow/Alert Engine handler if one exists for that
   `eventType`. Processing failures are recorded on the event row (`processing_error`), not
   returned as a 5xx — a failed handler is caught by nightly reconciliation, not by making the
   AssetCo retry a webhook that already succeeded.
6. Asset/customer rows referenced by payment/fault events may not exist yet (out-of-order delivery,
   or an AssetCo only emitting payment events during early testing). `registryStubs.js` upserts a
   minimal placeholder row to satisfy FK constraints; the real Asset Registry handlers (Week 4)
   overwrite these with authoritative data once `asset.created`/`customer.created` arrive.

## Testing approach

No live Supabase project is used in tests. `tests/testUtils/fakeSupabase.js` is a minimal in-memory
stand-in covering only the query-builder chain shapes the codebase actually uses (select/eq/order/
limit + maybeSingle/single, insert with optional `.select().single()`, upsert, update). If a new
service uses a chain shape the fake doesn't support yet, extend the fake rather than reaching for a
heavier mocking library.

## Working conventions

- **Commit at every important stage** — don't batch multiple weeks/features into one commit.
- Node.js is installed at `C:\Program Files\nodejs` but may not be on PATH in every shell session —
  if `node`/`npm` aren't found, run `$env:Path += ";C:\Program Files\nodejs"` first (PowerShell) or
  check the user has restarted their terminal.
- Follow the week-by-week structure in the MVP plan (`documents/CEF-PIP_MVP Implementation
  Plan.docx`, Section 4) rather than jumping ahead to later weeks' scope.
