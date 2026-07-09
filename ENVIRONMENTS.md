# Environments

Three environments, mapped to git branches, each with its own credentials so dev/staging data can
never appear in production:

| Environment | Git branch | Supabase project | Vercel | Render |
|---|---|---|---|---|
| Production | `main` | `cef-pip-prod` | Production deployment | `cef-pip-api` service (autodeploy on `main`) |
| Dev/Staging | `develop` | `cef-pip-dev` | Preview deployment (aliased) | `cef-pip-api-staging` service (autodeploy on `develop`) |
| Automated tests (CI) | any branch/PR | none — in-memory fake | n/a | n/a |

Automated Jest tests never touch a real Supabase project (see `api/tests/testUtils/fakeSupabase.js`)
— "test environment" for CI purposes needs no setup at all. "Dev/Staging" below is for manually
demoing the app and doing QA against a real database, which is what shows the team dummy data.

## 1. Branching model

- `main` — production. Only merge into this from `develop` once it's been checked on staging.
- `develop` — staging/dev. Feature work merges here first; this is what's demoed to the team.
- `feature/*` (optional) — cut from `develop`, merged back via PR. Vercel will still spin up an
  ephemeral preview for these automatically; point them at the same dev Supabase project.

```
git checkout -b develop
git push -u origin develop
```

Going forward: feature branches → PR into `develop` → demo/QA → PR `develop` → `main` → production.

## 2. Supabase — two projects

Supabase's free tier allows 2 projects, which maps exactly onto prod vs. everything-else:

1. Create **`cef-pip-dev`** — used by local development, the `develop` branch, and Vercel preview
   deployments. This is the one you seed with demo data (see step 5).
2. Create **`cef-pip-prod`** — used only by `main`. Leave it empty until the first live AssetCo
   integration in Week 6; never run `seed.sql` against it.

For each project, apply the schema in order:

```sql
-- In Supabase Studio → SQL Editor, run every file in api/src/db/migrations/
-- in numeric order (001, 002, 003, ... up through the highest-numbered file present).
```

From each project's **Settings → API Keys**, collect (Supabase's current key format — `sb_publishable_...` / `sb_secret_...` — replaces the older `anon` / `service_role` JWT-style keys, but both client libraries here accept it as a drop-in):
- `Project URL` → `SUPABASE_URL` (backend) / `NEXT_PUBLIC_SUPABASE_URL` (frontend)
- `sb_publishable_...` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (frontend only — safe to expose, RLS enforces access)
- `sb_secret_...` key → `SUPABASE_SECRET_KEY` (backend only — bypasses RLS, never expose to the frontend)

## 3. Vercel (dashboard)

1. Import the repo into Vercel, root directory `dashboard/`.
2. In **Settings → Git**, set Production Branch to `main`.
3. In **Settings → Environment Variables**, add the same two variable names twice, scoped
   differently:
   - Scope **Production** → values from `cef-pip-prod`
   - Scope **Preview** (and, optionally, **Development**) → values from `cef-pip-dev`
4. Vercel automatically deploys `main` to your production URL and every other branch/PR to its own
   preview URL using the Preview-scoped variables — that's what keeps dev data out of prod.
5. Optional: assign a stable alias (e.g. `cef-pip-staging.vercel.app`) to the `develop` branch under
   **Settings → Domains → Git Branch** so the team has one link to check instead of a new preview
   URL each time.

## 4. Render (API)

Render doesn't split env vars by branch within one service, so use **two services** instead:

1. **`cef-pip-api`** (production)
   - Branch: `main`
   - Env vars: `SUPABASE_URL` / `SUPABASE_SECRET_KEY` from `cef-pip-prod`, real `RESEND_API_KEY`
   - Plan: Starter ($7/mo) once a live AssetCo is onboarded (see MVP plan Week 6); free tier until then
2. **`cef-pip-api-staging`** (dev/staging)
   - Branch: `develop`
   - Env vars: from `cef-pip-dev`
   - Plan: Free tier is fine — it's only for demos/QA

Both auto-deploy on push to their respective branch. Root directory for both: `api/`.

## 5. Seeding demo data (dev project only)

To have something to show the team right now:

1. In `cef-pip-dev` → SQL Editor, run `api/src/db/seed.sql`. This creates a fictional AssetCo
   (`DEMOSOLAR`) with five assets covering: fully current, one missed payment, one defaulted, one
   with an open fault, one with a resolved fault — enough to populate every dashboard panel.
2. Create a demo login: Supabase Studio → **Authentication → Users → Add User** (e.g.
   `demo@cef-pip.dev` + a password). Copy the generated User UID.
3. Back in SQL Editor, tag that user with a role so the dashboard can look it up:
   ```sql
   insert into public.users (auth_user_id, email, role)
   values ('<paste-user-uid>', 'demo@cef-pip.dev', 'executive');
   ```
4. Log into the `develop`-branch dashboard URL with those credentials — the Portfolio, AssetCo, and
   Asset views should all show the seeded data.

Never run `seed.sql` against `cef-pip-prod`.

## 6. CI

GitHub Actions (`.github/workflows/api-ci.yml`) runs the Jest suite against the in-memory fake
Supabase client on every push and PR — it doesn't need environment-specific credentials at all,
since real Supabase is never touched in tests.
