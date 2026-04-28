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

These checks require the local function server and run through:

```bash
npm run qa:phase6-expanded
```

Current expanded matrix:

1. `qa:phase6-core`
2. `npm --prefix apps/admin run smoke:business-applications`
3. `npm --prefix apps/admin run smoke:qr-security`
4. `npm --prefix apps/admin run smoke:scan-race`

What each added smoke covers:

- `smoke:business-applications`
  - route-backed admin approve/reject flows through Edge Functions
- `smoke:qr-security`
  - missing bearer on `generate-qr-token`
  - missing bearer on `scan-qr`
  - tampered QR JWT
  - wrong QR token type
  - expired QR JWT
  - valid QR from another event where the scanner business is not joined
- `smoke:scan-race`
  - same QR scanned concurrently by two scanner contexts
  - one `SUCCESS` and one `QR_ALREADY_USED_OR_REPLAYED`
  - exactly one persisted `stamps`, `qr_token_uses`, and `STAMP_CREATED` audit row

These checks remain separate from the core matrix because they require extra runtime services:

- `npm --prefix apps/admin run smoke:business-applications`
  - requires the local admin app
  - requires the local function server
  - validates route-backed approve/reject flows through Edge Functions
- `npm --prefix apps/admin run smoke:qr-security`
  - requires the local function server
  - validates QR/JWT abuse handling through real Edge Function invocations
- `npm --prefix apps/admin run smoke:scan-race`
  - requires the local function server
  - validates atomic replay protection through real concurrent Edge Function invocations

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

For the first real browser click-path on admin review:

```bash
npm --prefix apps/admin exec playwright install chromium
supabase functions serve --env-file supabase/.env.local
npm run qa:browser-admin-review
```

`qa:browser-admin-review` currently does four things in order:

1. `supabase db reset --yes`
2. `npm --prefix apps/admin run lint`
3. `npm --prefix apps/admin run typecheck`
4. `npm --prefix apps/admin run smoke:browser-admin-review`

The browser smoke itself verifies:

- the local admin app is reachable at `/login`
- the local function server is reachable before the UI flow starts
- seeded platform admin sign-in through the real login form
- sidebar navigation to `/admin/business-applications`
- one approve action and one reject-with-reason action in the real browser
- resulting `business_applications` DB state after each click path
- cleanup of temporary applications, approved business rows, and related audit rows

## Mobile Realtime readiness audit

Run from repo root:

```bash
npm run qa:mobile-realtime-readiness
```

This focused audit currently does three things in order:

1. `npm --prefix apps/mobile run lint`
2. `npm --prefix apps/mobile run typecheck`
3. `npm --prefix apps/mobile run audit:realtime-readiness`

The audit is intentionally read-only. It verifies the current mobile repository state still matches the shipped Realtime foundation:

- the QR screen still refreshes tokens through polling
- the session provider still only subscribes to auth state changes
- `apps/mobile/src/features/realtime/student-realtime.ts` is present
- student leaderboard freshness uses Realtime invalidation through `leaderboard_updates`
- the current student’s progress freshness uses Realtime invalidation through `stamps` and their own `reward_claims`
- shared reward inventory freshness uses Realtime invalidation through `reward_tiers`

Expected success output today:

- `mobile-realtime-state:FOUNDATION_ACTIVE`
- `leaderboard-mode:realtime-invalidation`
- `student-progress-mode:realtime-invalidation`
- `shared-inventory-mode:realtime-invalidation`
- `qr-mode:polling-refresh`

If a future slice changes which screens own Realtime freshness or replaces invalidation with direct cache patching, this audit should be updated in the same change.

## Mobile reward notification bridge

For the local foreground reward notification bridge:

```bash
npm run qa:mobile-reward-notification-readiness
```

This focused audit currently does three things in order:

1. `npm --prefix apps/mobile run lint`
2. `npm --prefix apps/mobile run typecheck`
3. `npm --prefix apps/mobile run audit:reward-notification-bridge`

The audit is intentionally read-only. It verifies the current mobile repository state still matches the shipped reward notification follow-up:

- `StudentRewardNotificationBridge` is wired through `apps/mobile/src/providers/app-providers.tsx`
- the bridge reads the shared reward overview and reuses the existing student Realtime invalidation hooks
- local foreground reward notifications are present for reward unlock and stock-change behavior
- the rewards screen no longer owns a duplicate overview-level Realtime subscription
- docs still describe local foreground ownership honestly while also marking remote reward-unlocked push as backend-shipped

Expected success output today:

- `student-reward-notification-bridge:present`
- `notification-mode:local-foreground`
- `remote-reward-push:backend-shipped`
- `reward-screen-ownership:provider-bridge`
- `docs:aligned`

## Mobile native push device readiness

For the native push device-smoke readiness gate:

```bash
npm run qa:mobile-native-push-readiness
```

This focused audit currently does three things in order:

1. `npm --prefix apps/mobile run lint`
2. `npm --prefix apps/mobile run typecheck`
3. `npm --prefix apps/mobile run export:web`
4. `npm --prefix apps/mobile run audit:native-push-device-readiness`

The audit is intentionally read-only. It verifies the current mobile repository state still matches the shipped native push smoke-preparation slice:

- `expo-dev-client` is installed in `apps/mobile/package.json`
- the root layout imports `expo-dev-client`
- provider-owned notification diagnostics are wired through `apps/mobile/src/providers/app-providers.tsx`
- the diagnostics module captures the last received notification and the last notification response
- the student profile route exposes the manual smoke surface for runtime mode, permission state, and captured push activity
- docs still describe the physical-device requirement honestly

Expected success output today:

- `native-push-readiness:repo-wired`
- `dev-client:installed`
- `diagnostics-provider:present`
- `docs:aligned`

This audit does not claim that a notification was really delivered on a device. It only proves the repository wiring and export path needed for that smoke are in place. The next manual step after it is green is:

1. build and install a development build on a physical iPhone or Android device
2. sign in as a student on that build
3. enable notifications from the profile route
4. trigger a real remote push path such as reward unlock delivery
5. confirm the profile diagnostics surface records the received notification and, after opening it, the notification response
6. confirm those captured rows show a remote source, not only local foreground notification activity

## Reward-unlocked remote push smoke

For the backend reward-unlocked push path:

```bash
npm run qa:reward-unlocked-push-readiness
```

This focused readiness wrapper currently does two things in order:

1. `npm --prefix apps/admin run smoke:reward-unlocked-push`
2. `npm --prefix apps/mobile run audit:reward-notification-bridge`

The function smoke requires:

- local Supabase stack
- local function server from `supabase functions serve --env-file supabase/.env.local`
- the default local `EXPO_PUSH_API_URL=http://host.docker.internal:8789`

The smoke owns a temporary host-side mock Expo server on port `8789` and verifies:

- direct client RPC execution of `scan_stamp_atomic` is denied after the new execute grant restriction
- first scan unlocks only the first eligible reward tier
- already sold-out reward tiers do not produce a false unlock push
- second scan unlocks only the second threshold tier
- two push batches are sent, one per newly crossed unlock boundary
- two `REWARD_UNLOCKED` notification rows are recorded as `SENT`
- a third unlock with the mock server stopped is still scanned successfully and is persisted as a `FAILED` reward notification

This still does not replace native-device confirmation. Real remote receipt on iOS and Android remains a physical-device follow-up after the backend path is green.

## Hosted admin verification

For preview, staging, or production-like hosted checks:

```bash
npm --prefix apps/admin exec playwright install chromium
ADMIN_APP_BASE_URL=https://your-preview-or-staging-url \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD=secret \
npm run qa:staging-admin-verification
```

`qa:staging-admin-verification` currently does three things in order:

1. `npm --prefix apps/admin run lint`
2. `npm --prefix apps/admin run typecheck`
3. `npm --prefix apps/admin run smoke:hosted-admin-access`

The hosted smoke verifies:

- `/login` is reachable
- anonymous `/admin` redirects back to `/login`
- password sign-in works for the supplied admin credential
- `/admin` loads the dashboard shell
- `/admin/oversight`, `/admin/business-applications`, and `/admin/department-tags` all load through real sidebar navigation
- sign-out returns the browser to `/login`

The hosted smoke is intentionally read-only. It does not seed or mutate shared review data.

Before trusting a hosted Preview or Production build, also run the admin env preflight:

```bash
npm --prefix apps/admin run check:hosted-env
REQUIRE_HOSTED_ADMIN_ENV=1 \
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_real_value \
npm --prefix apps/admin run check:hosted-env
```

Hosted-required mode is the same policy the admin app uses during `prebuild` on Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` must be `https`
- `NEXT_PUBLIC_SUPABASE_URL` must not point at localhost or `127.0.0.1`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must not be an obvious example placeholder

The repository workflow `.github/workflows/staging-admin-verification.yml` can run the same smoke:

- manually via `workflow_dispatch`
- automatically from `deployment_status` when a successful deployment provides a target URL

Workflow secrets required:

- `STAGING_ADMIN_EMAIL`
- `STAGING_ADMIN_PASSWORD`
- `VERCEL_AUTOMATION_BYPASS_SECRET` when preview deployments are protected by Vercel SSO

Vercel project env vars required for the admin app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Hosted-admin readiness audit:

```bash
npm run qa:hosted-admin-readiness
npm --prefix apps/admin run audit:hosted-setup
npm run qa:custom-domain-readiness
npm --prefix apps/admin run audit:custom-domain-cutover
npm run qa:supabase-auth-cutover-readiness
npm --prefix apps/admin run audit:supabase-auth-url-config
SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run \
SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain \
npm --prefix apps/admin run apply:supabase-auth-url-config
```

`qa:hosted-admin-readiness` currently does three things in order:

1. `npm --prefix apps/admin run lint`
2. `npm --prefix apps/admin run typecheck`
3. `npm --prefix apps/admin run smoke:hosted-setup-audit`

`qa:custom-domain-readiness` currently does three things in order:

1. `npm --prefix apps/admin run lint`
2. `npm --prefix apps/admin run typecheck`
3. `npm --prefix apps/admin run smoke:custom-domain-cutover-audit`

`qa:supabase-auth-cutover-readiness` currently does three things in order:

1. `npm --prefix apps/admin run lint`
2. `npm --prefix apps/admin run typecheck`
3. `npm --prefix apps/admin run smoke:supabase-auth-url-config-audit`
4. `npm --prefix apps/admin run smoke:supabase-auth-url-config-apply`

The real `audit:hosted-setup` command is read-only and checks:

- Vercel CLI auth
- GitHub CLI auth
- linked `apps/admin/.vercel/project.json`
- required Preview env vars in Vercel
- required Production env vars in Vercel
- required GitHub Actions repo secrets

The real `audit:custom-domain-cutover` command is read-only and checks:

- latest production deployment is `READY`
- `admin.omaleima.fi` is attached to the Vercel project
- Vercel domain config is no longer marked misconfigured
- public DNS resolves to the Vercel-recommended record

The real `audit:supabase-auth-url-config` command is read-only and checks:

- hosted Supabase Auth `site_url` is either the current preview URL or the final custom domain
- required redirect URLs still include local web, preview web, custom-domain web, mobile deep link, Expo web, and preview wildcard entries
- Google OAuth is still enabled and still has a client id configured

The real `apply:supabase-auth-url-config` command supports two explicit modes:

- `SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run`
- `SUPABASE_AUTH_CONFIG_APPLY_MODE=apply`

and two explicit targets:

- `SUPABASE_AUTH_CONFIG_APPLY_TARGET=preview`
- `SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain`

It rejects same-state requests, preserves the canonical redirect allow-list, and blocks the `custom-domain` target until `audit:custom-domain-cutover` is green.

Important hosted caveat:

- If the Vercel project has SSO protection enabled for preview deployments, the public URL can still return `401` even after deploy success and even after the readiness audit passes link and env checks. In that case the next step is an external protection decision, not another repo change.
- The hosted smoke and workflow now support the `x-vercel-protection-bypass` header via `VERCEL_AUTOMATION_BYPASS_SECRET`, so a protected preview can still be tested without disabling SSO globally.

If it fails with a missing-link error, use:

```bash
vercel link --cwd apps/admin --project <project-name> --yes
```

If it fails with missing Vercel env vars, add them with:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL preview --cwd apps/admin
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview --cwd apps/admin
vercel env add NEXT_PUBLIC_SUPABASE_URL production --cwd apps/admin
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production --cwd apps/admin
```

If it fails with missing GitHub Actions secrets, add them with:

```bash
gh secret set STAGING_ADMIN_EMAIL --body 'admin@example.com'
gh secret set STAGING_ADMIN_PASSWORD --body 'replace-with-real-password'
gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --body 'replace-with-generated-bypass-secret'
```

If `audit:custom-domain-cutover` fails on DNS, follow the exact record it prints. The current expected record is:

```txt
A admin.omaleima.fi 76.76.21.21
```

If you prefer to use Vercel DNS instead of managing the A record at your registrar, delegate the domain to these nameservers first:

```txt
ns1.vercel-dns.com
ns2.vercel-dns.com
```

While DNS is still pending, `audit:supabase-auth-url-config` should continue to report `state:preview-site-url`. After the domain turns green and the Supabase dashboard cutover is done, the same audit should report `state:custom-domain-site-url`.

The safest rehearsal before the real cutover is:

```bash
SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run \
SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain \
npm --prefix apps/admin run apply:supabase-auth-url-config
```

Before DNS is ready, that command should fail on the custom-domain gate. After DNS is ready, the same dry-run should print the planned patch without writing. Only then should `SUPABASE_AUTH_CONFIG_APPLY_MODE=apply` be used.

For the full function-backed security matrix:

```bash
supabase functions serve --env-file supabase/.env.local
npm run qa:phase6-expanded
```

## Readiness matrix

These checks extend the expanded matrix with leaderboard refresh load validation:

```bash
supabase functions serve --env-file supabase/.env.local
npm run qa:phase6-readiness
```

Current readiness matrix:

1. `qa:phase6-expanded`
2. `npm --prefix apps/admin run smoke:leaderboard-load`

`smoke:leaderboard-load` verifies:

- one isolated `ACTIVE` event with `1000` registered students and `5000` valid `stamps`
- first `scheduled-leaderboard-refresh` run creates `1000` `leaderboard_scores`
- second run skips the already-fresh event
- a real follow-up `generate-qr-token` plus `scan-qr` creates one new valid dirty stamp
- the next refresh increments `leaderboard_updates.version`
- `get_event_leaderboard` stays readable after the refreshes

## What is still missing

The current local matrix is strong enough for branch-level Phase 6 work, but it still does not replace:

- broader hosted staging verification across club paths and controlled mutations
- broader browser click-path E2E across admin and club flows
- pilot dry-run with real operator devices

Event-day, fallback, and launch operations now live in [docs/LAUNCH_RUNBOOK.md](docs/LAUNCH_RUNBOOK.md).
