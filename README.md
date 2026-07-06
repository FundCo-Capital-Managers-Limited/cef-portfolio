# CEF-PIP — MVP

CEF Portfolio Intelligence Platform. Monorepo containing:

- `api/` — Express backend: Event Ingestion API, Cashflow Engine, Alert Engine, Reconciliation
- `dashboard/` — Next.js frontend: Portfolio / AssetCo / Asset dashboards
- `documents/` — architecture report, MVP plan, RFP, and supporting docs

See `documents/CEF-PIP_MVP Implementation Plan.docx` for the 6-week build plan this repo follows.

## Getting started

Requires Node.js 20+.

### API

```
cd api
cp .env.example .env   # fill in Supabase + Resend credentials
npm install
npm run dev             # starts on http://localhost:4000
npm test                 # runs Jest suite
```

Apply the DB schema in `api/src/db/migrations/001_init.sql` to your Supabase project (SQL editor or `supabase db push`).

### Dashboard

```
cd dashboard
cp .env.local.example .env.local
npm install
npm run dev              # starts on http://localhost:3000
```

## Event Ingestion API

`POST /api/v1/events` — receives CEF Integration Standard (CIS) events from AssetCo platforms.

Required headers:
- `X-CEF-AssetCo-Id` — the AssetCo identifier (must exist in the `assetcos` table)
- `X-CEF-Signature` — hex HMAC-SHA256 of the raw request body, signed with that AssetCo's secret

See `documents/CEF-PIP Solution Architecture Report.docx` §7 for the full event type list and payload structure.
