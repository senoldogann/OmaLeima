# Launch Runbook

## Scope

This document is the current launch and event-day operating guide for OmaLeima. It covers:

- what is already verified today
- what the owner still needs to do outside the repo
- pre-launch readiness checks
- event-day operator flow
- manual fallback when scanning cannot continue normally
- pilot rollout and rollback expectations

## Current verified state

As of `2026-04-29`, the following paths are already verified in the current hosted setup:

- hosted admin auth and route verification
- student Google login on a physical iPhone development build
- hosted device-token registration for push notifications
- remote push receipt and notification-open response on the same physical iPhone
- active-event QR generation and 30-second QR rotation
- hosted event registration for the student test fixture
- business scanner sign-in with the hosted scanner fixture account
- real hosted `scan-qr` execution through the mobile scanner fallback
- stamp creation plus reward-unlock push delivery through the real product path

What is **not** yet fully verified:

- Android physical-device smoke
- public App Store or Play Store distribution
- public custom domain cutover
- production-strength operator credentials replacing seeded smoke accounts

## Owner action items

These are the next user-owned tasks outside the repo. Split them into “needed before a private pilot” and “can wait until a broader public launch.”

### Needed before a private hosted pilot

1. Replace temporary hosted smoke accounts with real operator credentials.
2. Decide the first real pilot club, event, venue list, and scanner staff roster.
3. Confirm the hosted Supabase project is the one you want to keep using for the pilot.
4. Set the final hosted secrets and rotate any weak placeholder values.
5. Run one last pilot dry-run with real operator accounts before the event date.

### Can wait until later

1. Buying the final custom domain
2. Moving Supabase Auth off the temporary preview URL
3. Public App Store submission
4. Public Play Store submission
5. Full visual polish pass across the whole mobile UI

## Temporary fixture credentials

The following accounts exist only to support hosted smoke and manual validation. They must not survive into a real pilot unchanged:

- `organizer@omaleima.test`
- `scanner@omaleima.test`
- `admin@omaleima.test`
- any account still using `password123`

Before a private pilot:

1. create real operator accounts
2. verify access with those accounts
3. remove or disable temporary smoke accounts
4. rotate any shared passwords used during development

## Private-pilot go or no-go gate

Treat the project as ready for a **private hosted pilot** only when all of the following are true:

- hosted admin verification passes
- local QA gates still pass
- iPhone student flow passes
- iPhone scanner flow passes
- remote reward-unlock push is seen on the physical device
- real pilot operator credentials are in place
- seeded smoke credentials are disabled or removed
- event-day fallback ownership is assigned to named people

If any of those are false, the pilot is not green yet.

## Pre-launch readiness

Run these checks before a hosted pilot or a real event:

1. Local QA passes:
   - `npm run qa:phase6-core`
   - `npm run qa:phase6-expanded`
   - `npm run qa:phase6-readiness`
   - `ADMIN_APP_BASE_URL=https://your-preview-or-staging-url STAGING_ADMIN_EMAIL=... STAGING_ADMIN_PASSWORD=... npm run qa:staging-admin-verification`
2. Hosted environment secrets are set:
   - `QR_SIGNING_SECRET`
   - `SCHEDULED_JOB_SECRET`
   - `EXPO_PUSH_ACCESS_TOKEN` when push is enabled
3. Hosted admin env is checked:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `npm --prefix apps/admin run check:hosted-env`
4. Hosted admin setup is linked and audited:
   - `supabase db push --linked` the first time this hosted project is used, before creating hosted verification credentials
   - `vercel link --cwd apps/admin --project <project-name> --yes`
   - `vercel env add NEXT_PUBLIC_SUPABASE_URL preview --cwd apps/admin`
   - `vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview --cwd apps/admin`
   - `vercel env add NEXT_PUBLIC_SUPABASE_URL production --cwd apps/admin`
   - `vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production --cwd apps/admin`
   - `gh secret set STAGING_ADMIN_EMAIL --body 'admin@example.com'`
   - `gh secret set STAGING_ADMIN_PASSWORD --body 'replace-with-real-password'`
   - `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --body 'replace-with-generated-bypass-secret'` when preview protection is enabled
   - `npm --prefix apps/admin run audit:hosted-setup`
   - `npm --prefix apps/admin run audit:custom-domain-cutover`
5. Hosted preview verification credentials are set in GitHub repo secrets:
   - `STAGING_ADMIN_EMAIL`
   - `STAGING_ADMIN_PASSWORD`
6. Hosted auth providers are configured:
   - Google auth redirect allow-list for the mobile app
   - admin and club password accounts only for approved operators
7. Scheduled jobs are configured:
   - `scheduled-event-reminders`
   - `scheduled-leaderboard-refresh`
8. Event data is checked:
   - event window, join deadline, venue order, reward inventory, promotion limits
9. Operator access is checked:
   - scanner accounts can sign in
   - club organizer and club staff routing works
   - platform admin review routes work
10. Hosted admin verification is checked:
   - the latest preview or staging URL loads `/login`
   - anonymous `/admin` redirects to `/login`
   - admin sign-in, oversight, business applications, department tags, and sign-out all pass
11. Temporary fixture credentials are cleaned up:
   - `organizer@omaleima.test`
   - `scanner@omaleima.test`
   - `admin@omaleima.test`
   - any credential still using `password123`

## Hosted staging notes

- Vercel preview deployments use Preview environment variables by default.
- If you create a dedicated Vercel custom environment such as `staging`, deploy with `vercel deploy --target=staging` and pull matching variables with `vercel pull --environment=staging`.
- The admin app now runs a hosted env prebuild check on Vercel. If `NEXT_PUBLIC_SUPABASE_URL` still points at localhost or the publishable key is still an example placeholder, the build should fail immediately.
- The admin app now also has a read-only readiness audit. Run `npm --prefix apps/admin run audit:hosted-setup` after linking the real project or rotating secrets so the next hosted verification does not fail late.
- The admin app also now has a read-only Supabase auth-config audit. Run `npm --prefix apps/admin run audit:supabase-auth-url-config` before and after the auth-domain cutover so the live `site_url`, redirect allow-list, and Google OAuth state are verified from the repo.
- The admin app now also has a controlled apply command for the hosted auth-domain switch. Rehearse with `SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run` first; only use `apply` after the DNS and audit gates are green.
- If preview deployments are protected by Vercel SSO, a successful deploy can still return `401` to anonymous smoke checks. Treat that as deployment protection configuration, not as an app regression.
- While the custom domain is not ready, the current preview deployment URL is acting as the temporary Site URL in Supabase Auth. Replace it with `https://admin.omaleima.fi` later in one controlled pass.
- `https://admin.omaleima.fi` is currently just the planned future domain target. Do not treat it as an active requirement until the real domain has been purchased and delegated.
- If preview protection is enabled, make sure the verification workflow can access the URL before treating failures as app regressions.
- If the linked hosted Supabase project was just created, assume it is empty until `supabase db push --linked` has completed and a direct hosted API probe confirms tables like `profiles` and `clubs` are reachable.
- The custom domain is now attached in Vercel, but DNS still needs `A admin.omaleima.fi 76.76.21.21` before Supabase Auth can move off the preview URL.
- A matching Vercel DNS record already exists in the Vercel zone. If you want to use it, delegate the domain to `ns1.vercel-dns.com` and `ns2.vercel-dns.com` instead of managing the A record externally.

## Native push smoke handoff

Before asking a human tester to do the final remote push proof on a physical device:

1. `npm run qa:mobile-native-simulator-smoke`
2. `npm run qa:mobile-native-push-readiness`
3. confirm `apps/mobile/script/build_and_run.sh --help` works
4. confirm Codex actions inside `apps/mobile/.codex/environments/environment.toml` are present

This handoff does not mean simulator or emulator launch already passed. It only means the repo-owned entrypoints and diagnostics surface are wired and documented.

At that point the remaining human step should be only:

- install a development build on a physical device
- sign in
- enable notifications from the student profile route
- trigger a real remote reward-unlocked push
- confirm the diagnostics surface shows a remote source for both receipt and response

## Physical device verification status

Current reality:

- iPhone development-build smoke: passed
- Android physical-device smoke: not yet passed

That means a private pilot can still move forward if iPhone is the only supported operator path for the first event, but broader public rollout should wait until Android is also validated or intentionally declared out of scope for launch.

## Custom-domain cutover order

Do the auth-domain cutover in this exact order:

1. `npm --prefix apps/admin run audit:custom-domain-cutover`
2. wait until the audit turns `READY`
3. `npm --prefix apps/admin run audit:supabase-auth-url-config` and confirm it still reports `state:preview-site-url`
4. `SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain npm --prefix apps/admin run apply:supabase-auth-url-config`
5. `SUPABASE_AUTH_CONFIG_APPLY_MODE=apply SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain npm --prefix apps/admin run apply:supabase-auth-url-config`
6. update Google OAuth allowed origins and redirect notes if they still mention the temporary preview URL
7. rerun `npm --prefix apps/admin run audit:supabase-auth-url-config` and confirm it now reports `state:custom-domain-site-url`
8. rerun hosted admin verification against `https://admin.omaleima.fi`

## Event-day checklist

### Before doors open

1. Confirm the event is `ACTIVE`.
2. Confirm every expected venue row is `JOINED`.
3. Confirm each scanner operator can open the business scanner screen.
4. Confirm at least one real QR can be generated and scanned successfully.
5. Confirm leaderboard refresh has run once after valid stamps exist.
6. Confirm reward tiers and stock counts match the physical handout plan.
7. Confirm club staff know the manual fallback process below.

### During the event

1. Watch `/admin/oversight` for fraud signals and audit anomalies.
2. Watch `/club/claims` for reward claim flow and stock pressure.
3. If one scanner device fails, switch that venue to another approved scanner account.
4. If scanning latency spikes, pause duplicate retries and verify the latest scan result before rescanning.
5. If push reminders fail, continue the event. Push is non-blocking for scanning and reward claims.

### After the event

1. Confirm the last leaderboard refresh completed successfully.
2. Confirm reward claims and scan history look internally consistent.
3. Export or capture any operational notes while context is still fresh.
4. Revoke or rotate temporary operator credentials created only for that event.

## Manual fallback

Use manual fallback only when venue staff cannot complete normal scanning.

### Allowed fallback cases

- scanner camera is unavailable
- function server or hosted API is degraded
- venue network is unstable long enough to block normal flow

### Required fallback record

Capture one row per manual stamp:

| Field | Required |
| --- | --- |
| timestamp | yes |
| event name | yes |
| venue name | yes |
| scanner staff name | yes |
| student display label | yes |
| student profile id suffix or visible identifier | yes |
| reason for fallback | yes |

Recommended format:

```txt
2026-04-28T19:42:00+03:00 | Kiertajaiset 2026 | Test Bar 2 | Scanner A | Student ...0011 | last4=0011 | scanner network outage
```

### Fallback operating rule

When fallback is active for a venue:

1. Stop repeated QR retries for the same student.
2. Record the fallback row immediately.
3. Let one named operator own the list for that venue.
4. Reconcile the list with club organizers after the incident window ends.

Manual fallback rows must be reconciled by organizers before any out-of-band DB write is considered. Do not improvise direct table edits during the event.

## Pilot rollout

Start with a narrow hosted pilot:

1. one club
2. one event
3. two to five venues
4. known scanner staff
5. limited reward inventory

Recommended owner constraint for the first pilot:

- one real organizer
- one backup organizer
- one to three scanner staff
- one fallback communication channel outside the app
- one named person responsible for manual fallback reconciliation

Success signals for the pilot:

- students can join and open rotating QR without support
- venues can scan without replay confusion
- leaderboard updates stay consistent after repeated refreshes
- reward claim flow does not oversell stock
- no unexpected fraud or RLS leaks appear in oversight review

Pilot stop signals:

- scanner staff cannot reliably finish scans within the live event window
- student login or QR generation fails for multiple users
- push works inconsistently enough that operators lose trust in reward state
- seeded or temporary credentials are still mixed into live operator access

## Rollback

Rollback means reverting to the manual leima process for the remainder of the event.

Trigger rollback when:

- QR generation is unavailable for a sustained period
- scans cannot be confirmed reliably
- multiple venues are blocked at the same time
- operator trust in the current scan state is lost

Rollback steps:

1. Announce manual fallback to scanner staff and club organizers.
2. Freeze new reward handoff decisions until fallback records are consistent.
3. Keep collecting manual fallback rows with named operator ownership.
4. Avoid partial direct database repair during the live incident.
5. Reconcile after the event in one controlled pass.
