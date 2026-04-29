# OmaLeima Admin

Next.js App Router admin and club organizer panel for OmaLeima.

## Required env

Create `.env.local` from `.env.example`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Run

```bash
npm run dev
```

Recommended smoke-test URL:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Default local URL: [http://localhost:3000](http://localhost:3000)

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:auth
npm run smoke:business-applications
npm run smoke:browser-admin-review
npm run apply:supabase-auth-url-config
npm run audit:custom-domain-cutover
npm run audit:hosted-setup
npm run audit:pilot-operator-hygiene
npm run audit:supabase-auth-url-config
npm run check:hosted-env
npm run smoke:club-department-tags
npm run smoke:club-events
npm run smoke:club-claims
npm run smoke:custom-domain-cutover-audit
npm run smoke:department-tags
npm run smoke:hosted-admin-access
npm run smoke:hosted-setup-audit
npm run smoke:leaderboard-load
npm run smoke:oversight
npm run smoke:qr-security
npm run smoke:rls-core
npm run smoke:scan-race
npm run smoke:routes
npm run smoke:supabase-auth-url-config-apply
npm run smoke:supabase-auth-url-config-audit
```

Repo root Phase 6 core entry point:

```bash
npm run qa:phase6-core
```

Repo root expanded function-backed entry point:

```bash
npm run qa:phase6-expanded
```

Repo root readiness entry point:

```bash
npm run qa:phase6-readiness
```

Repo root browser click-path entry point:

```bash
npm run qa:browser-admin-review
```

Repo root hosted verification entry point:

```bash
ADMIN_APP_BASE_URL=https://your-preview-or-staging-url \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD=secret \
npm run qa:staging-admin-verification
```

Repo root hosted readiness audit entry point:

```bash
npm run qa:hosted-admin-readiness
```

Repo root pilot operator readiness entry point:

```bash
npm run qa:pilot-operator-readiness
```

Repo root custom-domain readiness entry point:

```bash
npm run qa:custom-domain-readiness
```

Repo root Supabase auth cutover readiness entry point:

```bash
npm run qa:supabase-auth-cutover-readiness
```

Hosted env preflight:

```bash
npm run check:hosted-env
REQUIRE_HOSTED_ADMIN_ENV=1 \
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_real_value \
npm run check:hosted-env
```

`npm run smoke:routes` expects a running local admin app at `http://localhost:3001` by default. Override with `ADMIN_APP_BASE_URL` when needed.
Route-backed smokes that hit Edge Functions also expect the local function server to be running with secrets loaded:

```bash
supabase functions serve --env-file supabase/.env.local
```

Install the local browser once before the Playwright smoke:

```bash
npm exec playwright install chromium
```

`npm run smoke:business-applications` expects the local Supabase stack and the local admin app to be running so the seeded auth users, `business_applications` table, review Edge Functions, and route-backed review API are all available.
`npm run smoke:browser-admin-review` expects the local Supabase stack, the local admin app, the local function server, and the local Docker-backed Supabase DB container to be running so it can seed pending applications, sign in through the real `/login` page, click approve and reject in the browser, and verify the resulting DB state.
`npm run audit:custom-domain-cutover` expects Vercel CLI auth and a linked `apps/admin/.vercel/project.json`. It is read-only and checks whether the latest production deployment is ready, whether `admin.omaleima.fi` is attached and verified in Vercel, and whether DNS now matches the Vercel-recommended record before Supabase Auth is switched away from the temporary preview URL.
`npm run audit:hosted-setup` expects Vercel CLI auth, GitHub CLI auth, a linked `apps/admin/.vercel/project.json`, the required Preview and Production Vercel env names, and the required GitHub Actions repo secrets. It is read-only and meant to answer “are we actually ready to verify a hosted admin deployment from this workstation?”
`npm run audit:pilot-operator-hygiene` expects Supabase CLI auth for the hosted project. It is read-only and checks whether temporary `@omaleima.test` auth users still exist and whether any such users still hold active privileged `profiles`, `business_staff`, or `club_members` access in hosted data.
`npm run audit:supabase-auth-url-config` expects a hosted Supabase management token, either from `SUPABASE_ACCESS_TOKEN` or from an existing `supabase login` session in the macOS keychain. It is read-only and checks whether hosted Supabase Auth is still in the expected preview-mode or has already moved to custom-domain-mode, whether the required redirect URLs are all present, and whether Google OAuth is still enabled.
`npm run apply:supabase-auth-url-config` expects `SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run|apply` and `SUPABASE_AUTH_CONFIG_APPLY_TARGET=preview|custom-domain`. It uses the same hosted management token path as the audit, refuses to run if the current state is already the requested target, and blocks `custom-domain` writes until `npm run audit:custom-domain-cutover` is green. The command always writes the canonical redirect allow-list; only `site_url` changes between the two modes.
`npm run check:hosted-env` always validates admin public env presence and URL shape. When `VERCEL=1` or `REQUIRE_HOSTED_ADMIN_ENV=1`, it additionally requires an `https` Supabase URL, rejects localhost/127.0.0.1 targets, and rejects obvious example publishable-key placeholders.
`npm run smoke:hosted-admin-access` expects `ADMIN_APP_BASE_URL`, `STAGING_ADMIN_EMAIL`, and `STAGING_ADMIN_PASSWORD`. It does not seed data or touch review mutations; it signs in through the real login page, checks anonymous `/admin` redirect behavior, opens the admin dashboard, visits the three current admin routes, and signs out again.
`npm run smoke:hosted-setup-audit` is the deterministic fixture-backed smoke for the audit script itself. It verifies one missing-link failure and one fully-ready success path without depending on a real linked project or real hosted secrets.
`npm run smoke:pilot-operator-hygiene-audit` is the deterministic fixture-backed smoke for the pilot operator hygiene audit. It verifies one failing hosted-fixture path and one clean success path without touching the real hosted project.
`npm run smoke:custom-domain-cutover-audit` is the deterministic fixture-backed smoke for the custom-domain audit itself. It verifies one production-not-ready failure, one DNS-pending failure, and one fully-ready success path without depending on the live domain state.
`npm run smoke:supabase-auth-url-config-audit` is the deterministic fixture-backed smoke for the hosted Supabase auth-config audit itself. It verifies one missing-redirect failure, one Google-disabled failure, one preview-mode success path, and one custom-domain-mode success path without touching the real hosted project.
`npm run smoke:supabase-auth-url-config-apply` is the deterministic fixture-backed smoke for the cutover apply command itself. It verifies same-state rejection, DNS gate rejection, preview-to-custom dry-run planning, custom-to-preview dry-run planning, and the write-path verification flow with fixture responses instead of touching the real hosted project.
`npm run smoke:club-department-tags` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so temporary organizer-club and club-staff fixtures can be seeded and cleaned up around the route test.
`npm run smoke:club-events` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so a temporary club staff fixture can be seeded and cleaned up around the route test.
`npm run smoke:club-claims` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so temporary club staff, reward-tier, stamp, and claim fixtures can be seeded and cleaned up around the route test.
`npm run smoke:club-rewards` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so temporary club staff and claimed-inventory fixtures can be seeded and cleaned up around the route test.
`npm run smoke:department-tags` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so moderation fixtures can be seeded directly.
`npm run smoke:oversight` expects the local Supabase stack, the local admin app, and the local Docker-backed Supabase DB container to be running so oversight fixtures can be seeded directly.
`npm run smoke:leaderboard-load` expects the local Supabase stack, the local function server, and the local Docker-backed Supabase DB container to be running so an isolated 1000-student event, 5000 valid stamp rows, and a dirty refresh follow-up can be seeded and cleaned up around the scheduled leaderboard refresh smoke.
`npm run smoke:qr-security` expects the local Supabase stack, the local function server, and the local Docker-backed Supabase DB container to be running so wrong-event fixtures can be seeded directly and function auth paths can be invoked.
`npm run smoke:rls-core` expects the local Supabase stack and the local Docker-backed Supabase DB container to be running so cross-user stamp and audit-log fixtures can be seeded directly.
`npm run smoke:scan-race` expects the local Supabase stack, the local function server, and the local Docker-backed Supabase DB container to be running so a second scanner fixture and isolated event rows can be seeded and cleaned up around the race test.

## Hosted verification workflow

The repo now includes `.github/workflows/staging-admin-verification.yml`.

It supports:

- `workflow_dispatch` with `admin_app_base_url`
- `deployment_status` after a successful deployment event with a target URL

Required repository secrets:

- `STAGING_ADMIN_EMAIL`
- `STAGING_ADMIN_PASSWORD`
- `VERCEL_AUTOMATION_BYPASS_SECRET` when preview deployments are protected by Vercel SSO

This workflow installs `apps/admin` dependencies, installs Playwright Chromium, and runs `node tests/run-staging-admin-verification.mjs`.

## Vercel setup notes

Expected Vercel project setup for the admin app:

- Root Directory: `apps/admin`
- Framework preset pinned in repo by [`apps/admin/vercel.json`](/Users/dogan/Desktop/OmaLeima/apps/admin/vercel.json) with `framework: nextjs`
- Preview and Production env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Automatically expose System Environment Variables: enabled, so `VERCEL=1` and `VERCEL_TARGET_ENV` are available to the prebuild env check
- If Vercel project protection reports SSO for preview deployments, anonymous `curl` checks and the hosted verification workflow will still return `401` until you either disable SSO protection for the project or switch the verification path to an allowed bypass model.
- Current temporary Site URL: `https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app`
- Future custom-domain replacement placeholder: `https://admin.omaleima.fi`
- Keep the preview URL as the live hosted auth URL until a real domain is actually purchased and DNS is ready.
- Current custom-domain DNS instruction: `A admin.omaleima.fi 76.76.21.21`
- Alternative custom-domain DNS path: delegate the domain to `ns1.vercel-dns.com` and `ns2.vercel-dns.com` so the existing Vercel DNS record becomes active

Preview verification also expects these GitHub repo secrets for `.github/workflows/staging-admin-verification.yml`:

- `STAGING_ADMIN_EMAIL`
- `STAGING_ADMIN_PASSWORD`

Recommended setup commands:

```bash
vercel link --cwd apps/admin --project <project-name> --yes
vercel env add NEXT_PUBLIC_SUPABASE_URL preview --cwd apps/admin
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview --cwd apps/admin
vercel env add NEXT_PUBLIC_SUPABASE_URL production --cwd apps/admin
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production --cwd apps/admin
gh secret set STAGING_ADMIN_EMAIL --body 'admin@example.com'
gh secret set STAGING_ADMIN_PASSWORD --body 'replace-with-real-password'
gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --body 'replace-with-generated-bypass-secret'
npm run audit:hosted-setup
npm run audit:custom-domain-cutover
npm run audit:supabase-auth-url-config
SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run \
SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain \
npm run apply:supabase-auth-url-config
```

## Current routes

- `/login`
- `/admin`
- `/admin/business-applications`
- `/admin/department-tags`
- `/admin/oversight`
- `/club`
- `/club/claims`
- `/club/department-tags`
- `/club/events`
- `/club/rewards`
- `/forbidden`

## Current auth shape

- Supabase SSR browser/server clients
- `proxy.ts` session refresh path
- root redirect based on `profiles.primary_role` and `profiles.status`
- password sign-in for local seeded smoke accounts
- Google OAuth trigger for hosted auth
- pending business application review page with approve and reject actions through Edge Functions
- app-local review-flow smoke coverage for RLS visibility and stale-review handling
- app-local browser click-path smoke coverage for seeded admin login plus approve and reject review actions through the real UI
- hosted admin verification smoke coverage for login, redirect boundaries, admin navigation, and sign-out against deployed URLs
- hosted admin readiness audit coverage for linked project presence, required Vercel env names, and GitHub Actions repo secrets
- hosted Supabase auth-config audit coverage for preview-mode versus custom-domain-mode, required redirect URLs, and Google OAuth enablement
- hosted Supabase auth-config apply coverage for dry-run planning, state guards, DNS gate enforcement, and verified write-path behavior
- hosted env preflight coverage for Vercel Preview, Production, and custom hosted targets
- department-tag moderation page with route-backed merge and block actions through atomic database functions
- app-local department-tag smoke coverage for non-admin RLS, validation boundaries, and profile-link repair
- platform oversight page for clubs, events, audit logs, and fraud signals
- app-local oversight smoke coverage for admin-only audit visibility, event-scoped fraud visibility, and route rendering
- club official department-tag creation page with organizer-only publish access and route-backed mutation flow
- app-local club department-tag smoke coverage for direct-write RLS blocking, duplicate handling, cross-club title reuse, and fixture cleanup isolation
- club event creation page with organizer-only create access, club selection, recent draft visibility, and route-backed create flow
- app-local club event smoke coverage for RLS insert blocking, malformed payload validation, concurrent slug creation, and fixture cleanup before later admin smokes
- club reward-claims page with masked student candidates, recent handoff history, and route-backed confirmation through `claim_reward_atomic`
- app-local club claim smoke coverage for staff and organizer access, direct-write RLS blocking, duplicate or out-of-stock rejection, and fixture cleanup isolation
- club reward-tier management page with organizer-only create/update access, event-scoped stock visibility, and route-backed mutation flow
- app-local club reward smoke coverage for direct-write RLS blocking, claimed-stock inventory floor, and fixture cleanup isolation

## Next follow-up slices

- broader hosted browser coverage for club routes and staged business review mutations
- real preview deployment verification after the Vercel project is linked and secrets are set
