# Testing

## Scope

This document defines the current local QA path for OmaLeima. Phase 6 is intentionally split into small slices, so this file covers the test matrix that exists today and the prerequisites needed to run it reliably.

## Local prerequisites

### Supabase local stack

The current smoke suite expects the Docker-backed local Supabase stack to be available for:

- `supabase db reset`
- deterministic seed data
- direct SQL fixtures for RLS and admin route smokes

Required baseline:

```bash
supabase start
supabase db reset --yes
```

### Admin app

Route-backed admin and club smoke scripts expect a running local Next.js app.

```bash
npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001
```

Default app base URL:

- `http://localhost:3001`

Override with:

- `ADMIN_APP_BASE_URL`

### Local env

`apps/admin/.env.local` must contain a working local Supabase URL and publishable key.

### Local Edge Functions

Only the expanded review flows that call Edge Functions require the function server. Start it when you want those smokes:

```bash
supabase functions serve --env-file supabase/.env.local
```

## Phase 6 core matrix

Run from repo root:

```bash
npm run qa:phase6-core
```

Current core matrix:

1. `supabase db reset`
2. `apps/admin` lint
3. `apps/admin` typecheck
4. `apps/admin` build
5. `smoke:auth`
6. `smoke:routes`
7. `smoke:oversight`
8. `smoke:department-tags`
9. `smoke:club-events`
10. `smoke:club-rewards`
11. `smoke:club-claims`
12. `smoke:club-department-tags`
13. `smoke:rls-core`

This matrix is the default local gate before adding new Phase 6 coverage.

## Focused RLS regression

Run from `apps/admin`:

```bash
npm run smoke:rls-core
```

This script currently verifies:

- students cannot insert direct `stamps` rows
- students cannot read another student’s stamp row
- students can still read their own stamp row
- students cannot insert direct `reward_claims` rows
- organizers cannot read `audit_logs`
- platform admins can read `audit_logs`

The goal is to keep one explicit, small, repeatable script for core zero-trust regressions instead of relying on scattered route smokes to imply RLS correctness.

## Expanded matrix

These checks remain important, but they are not in the root `qa:phase6-core` command because they require extra runtime services or a broader setup:

- `npm --prefix apps/admin run smoke:business-applications`
  - requires the local admin app
  - requires the local function server
  - validates route-backed approve/reject flows through Edge Functions

## Recommended local order

For routine work:

```bash
supabase start
npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001
npm run qa:phase6-core
```

For admin review flows:

```bash
supabase functions serve --env-file supabase/.env.local
npm --prefix apps/admin run smoke:business-applications
```

## What is still missing

This foundation does not close the full Phase 6 checklist yet. The remaining major slices are still open:

- invalid JWT and cross-event QR abuse scenarios
- concurrency and duplicate-scan race harnesses
- leaderboard and cron load validation
- event-day checklist
- offline fallback documentation
- deploy and go-to-market runbooks
