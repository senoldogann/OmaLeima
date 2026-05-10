# Testing

## Scope

This document defines the current local QA path for OmaLeima. Phase 6 is intentionally split into small slices, so this file covers the test matrix that exists today and the prerequisites needed to run it reliably.

## Local prerequisites

### Supabase local stack

The current smoke suite expects the Docker-backed local Supabase stack to be available for:

- current migrations applied with Supabase CLI `2.98.2`
- deterministic seed data
- direct SQL fixtures for RLS and admin route smokes

Recommended baseline for this repository:

```bash
npx --yes supabase@2.98.2 start
npx --yes supabase@2.98.2 migration up --local
docker restart supabase_auth_omaleima
docker exec -i supabase_db_omaleima psql -v ON_ERROR_STOP=1 -U postgres -d postgres < supabase/seed.sql
```

Use a clean reset only when you specifically need an isolated database rebuild and the local Supabase services bootstrap cleanly:

```bash
npx --yes supabase@2.98.2 db reset --yes
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

1. local Supabase schema and seed baseline
2. `apps/admin` lint
3. `apps/admin` typecheck
4. `apps/admin` build
5. `smoke:auth`
6. `smoke:routes`
7. `smoke:dashboard-browser`
8. `smoke:oversight`
9. `smoke:department-tags`
10. `smoke:club-events`
11. `smoke:club-rewards`
12. `smoke:club-claims`
13. `smoke:club-department-tags`
14. `smoke:rls-core`

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
npx --yes supabase@2.98.2 start
npx --yes supabase@2.98.2 migration up --local
docker restart supabase_auth_omaleima
docker exec -i supabase_db_omaleima psql -v ON_ERROR_STOP=1 -U postgres -d postgres < supabase/seed.sql
npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001
npm run qa:phase6-core
```

For admin review flows:

```bash
supabase functions serve --env-file supabase/.env.local
npm --prefix apps/admin run smoke:business-applications
```

For a credentialed browser check of dashboard navigation and locale switching:

```bash
ADMIN_APP_BASE_URL=http://localhost:3001 npm --prefix apps/admin run smoke:dashboard-browser
```

For the first real browser click-path on admin review:

```bash
npm --prefix apps/admin exec playwright install chromium
supabase functions serve --env-file supabase/.env.local
npm run qa:browser-admin-review
```

`qa:browser-admin-review` currently does four things in order:

1. local Supabase schema and seed baseline
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

## Mobile redesign runtime proof

The current full mobile redesign has now cleared one real signed-in runtime proof path on local web:

- business email/password sign-in
- redesigned business home
- redesigned business events
- redesigned business scanner

This proof was captured through the local Expo web runtime instead of relying on static export alone.

What is still intentionally open:

- local student Google-linked runtime proof on web

That remaining gap is documented on purpose. Student-facing redesign work is already physically validated on iPhone for the real auth, QR, scanner, stamp, and reward-unlock flow, but the local web redesign proof should not claim a Google-linked path that is still awkward in Expo web or Expo Go.

## Android emulator fallback

When no physical Android phone is available, use the Android emulator as a partial smoke path instead of blocking the whole roadmap.

What the emulator can still validate:

- development-build launch
- Expo Go app launch and route shell
- session restore and route guards
- event list and event join flow
- active-event and QR screen rendering
- business login and scanner screen UI
- camera-based scanner smoke against the hosted backend

What the emulator does **not** prove:

- student Google sign-in through the native Android callback path when the app is only running in Expo Go
- real Expo remote push delivery on Android
- notification tap/open behavior through the real Android push service
- final Android release-mode push behavior

Official Expo guidance is still that push notifications are not supported on Android emulators and iOS simulators, and a real device is required for that part of the path.

Recommended fallback order:

1. run the repo-owned simulator gate. This runs static wiring checks and, when local Android/iOS tooling is available, the executable native launch smoke:

```bash
npm run qa:mobile-native-simulator-smoke
```

2. run the direct executable native simulator smoke only when you want to repeat just the install/launch/crash portion:

```bash
npm --prefix apps/mobile run smoke:native-simulators
```

3. start the mobile app with Android support for credentialed manual flow checks:

```bash
cd apps/mobile
npx expo start --android
```

4. use the emulator to verify business login, event, QR, and scanner flows
5. keep Android remote push as an explicit open risk until a real Android phone is available

Current readiness matrix:

- iPhone student Google login: passed on a physical development build
- iPhone remote push receipt and open response: passed on a physical development build

## Mobile store/public-launch readiness

Run from repo root:

```bash
npm run qa:mobile-store-release-readiness
```

The direct local command is:

```bash
npm --prefix apps/mobile run audit:store-release-readiness
```

This gate checks repo-owned broader-launch prerequisites only:

- app identity wiring in `app.config.ts`
- iOS bundle identifier and Android package name
- store-facing build assets and splash/icon references
- native policy fields like camera permission text and `ITSAppUsesNonExemptEncryption`
- Android store permission hygiene: `SYSTEM_ALERT_WINDOW` and `RECORD_AUDIO` blocked, and Android backup disabled
- iOS privacy manifest source-of-truth for app-functional collected data types with tracking disabled
- generated local iOS `PrivacyInfo.xcprivacy` alignment, iOS Always/background location hygiene, Expo Dev Launcher local-network plist hygiene, and stale iOS Pods path checks when the ignored `apps/mobile/ios` project is present; run `OMALEIMA_STORE_BUILD=1 npx expo prebuild --platform ios --no-install` and then `pod install` from `apps/mobile/ios` after privacy/config/dependency changes before local Xcode release builds
- public privacy notice coverage for the mobile app, QR/leima/reward data, push tokens, scanner location proof, and account/data deletion requests
- in-app Privacy and Terms links on login and signed-in profile/settings surfaces
- in-app account/data deletion request initiation through the mobile support flow
- public privacy-page web resource for account and associated data deletion requests
- hosted active mobile login slides through the public Supabase API, including placeholder/test copy, Finnish/English localized copy, and HTTPS image URL hygiene
- Expo notifications and native project wiring
- explicit EAS build environments for development, preview, and production when using EAS
- required remote Expo EAS environment-variable names for development, preview, and production when using EAS
- local native release mode via `OMALEIMA_NATIVE_RELEASE_MODE=local` when EAS quota/subscription is unavailable
- owner-facing store/public-launch checklist documentation

For CI or offline script tests where the EAS CLI cannot read remote environment state, set `MOBILE_STORE_EAS_ENV_LIST_JSON` to a JSON array shaped like the EAS environment list output:

```bash
MOBILE_STORE_EAS_ENV_LIST_JSON='[{"name":"production","variables":[{"name":"EXPO_PUBLIC_SUPABASE_URL"},{"name":"EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"}]}]' \
  npm --prefix apps/mobile run audit:store-release-readiness
```

Use this override only to simulate deterministic EAS input. For a final EAS store release gate, run the audit against the real EAS project state. If the release is intentionally local/manual, run `OMALEIMA_NATIVE_RELEASE_MODE=local npm --prefix apps/mobile run audit:store-release-readiness` and keep App Store Connect / Play Console upload evidence outside the repo.

This gate does **not** prove App Store Connect or Google Play Console state. It also does **not** prove:

- screenshots or listing copy
- privacy-policy or support URLs configured in store consoles
- Apple or Google account setup
- Sign in with Apple or an equivalent privacy-preserving login option for iOS App Store submission while student primary login uses Google
- the final Android target API level from a produced release AAB uploaded to Google Play Console
- EAS Submit credentials or app IDs stored outside the repo

## Pilot operator hygiene readiness

Run from repo root:

```bash
npm run qa:pilot-operator-readiness
```

This focused readiness wrapper currently does three things in order:

1. `npm --prefix apps/admin run lint`
2. `npm --prefix apps/admin run typecheck`
3. `npm --prefix apps/admin run smoke:pilot-operator-hygiene-audit`

The real hosted audit is:

```bash
npm --prefix apps/admin run audit:pilot-operator-hygiene
```

The hosted bootstrap command that creates placeholder pilot operator accounts and writes the local credential file is:

```bash
npm --prefix apps/admin run bootstrap:pilot-operator-accounts
```

It is read-only and checks:

- whether known fixture users like `admin@omaleima.test`, `organizer@omaleima.test`, and `scanner@omaleima.test` still exist in hosted auth
- whether any `@omaleima.test` user still has a privileged profile role
- whether any `@omaleima.test` user still has active `business_staff` or `club_members` access

This audit does not prove password rotation by itself. It is specifically a hosted-user and privileged-membership cleanup gate before a private pilot.

## Pilot secret/password hygiene

Run from repo root:

```bash
npm run qa:pilot-secret-hygiene
```

The direct local command is:

```bash
npm --prefix apps/admin run audit:pilot-secret-hygiene
```

This gate reads the local Desktop credential file at `/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt` and checks:

- the file still exists at the expected path
- the file mode is still strict owner-only (`600`)
- admin, organizer, and scanner credentials still parse correctly
- passwords are not duplicated across operator accounts
- passwords are not known weak placeholders such as `password123`
- passwords still meet the current minimum complexity gate
- required GitHub secret names are still present:
  - `STAGING_ADMIN_EMAIL`
  - `STAGING_ADMIN_PASSWORD`
  - `VERCEL_AUTOMATION_BYPASS_SECRET`

This is intentionally a local hygiene gate. It does **not** prove:

- the exact GitHub secret values
- browser rendering
- device behavior
- hosted role or membership shape by itself

## Private pilot final dry-run

Run from repo root:

```bash
npm run qa:private-pilot-final-dry-run
```

The direct hosted command is:

```bash
npm --prefix apps/admin run run:pilot-final-dry-run
```

This gate reads the local Desktop credential file at `/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt` and proves:

- the current hosted admin account can still sign in with password auth
- the current hosted organizer account can still sign in and still has at least one active `club_members` row
- the current hosted scanner account can still sign in and still has at least one active `business_staff` row
- the hosted fixture-account hygiene audit is still green in the same run

This gate is intentionally narrower than a full browser or device smoke. It does **not** prove:

- admin route rendering in the browser
- iPhone or Android device behavior
- real scan execution
- real reward push delivery

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

This focused audit currently does four things in order:

1. `npm --prefix apps/mobile run lint`
2. `npm --prefix apps/mobile run typecheck`
3. `npm --prefix apps/mobile run export:web`
4. `npm --prefix apps/mobile run audit:native-push-device-readiness`

The audit is intentionally read-only. It verifies the current mobile repository state still matches the shipped native push smoke-preparation slice:

- `expo-dev-client` is installed in `apps/mobile/package.json`
- the root layout imports `expo-dev-client`
- provider-owned notification diagnostics are wired through `apps/mobile/src/providers/app-providers.tsx`
- the runtime label recognizes the current physical-device dev client as a development build instead of falling back to `bare`
- the diagnostics module captures the last received notification and the last notification response
- provider-owned diagnostics capture records runtime mode, permission state, and captured push activity without exposing debug controls on the student profile route
- docs still describe the physical-device requirement honestly

Expected success output today:

- `native-push-readiness:repo-wired`
- `dev-client:installed`
- `diagnostics-provider:present`
- `docs:aligned`

This audit does not claim that a notification was really delivered on a device. It only proves the repository wiring and export path needed for that smoke are in place. The next manual step after it is green is:

1. build and install a development build on a physical iPhone or Android device
2. sign in as a student on that build
3. enable notifications from the native permission prompt or device settings
4. trigger a real remote push path such as reward unlock delivery
5. confirm the profile diagnostics modal records the received notification and, after opening it, the notification response
6. confirm provider-owned diagnostics capture shows a remote source, not only local foreground notification activity

## Mobile leima card save/share device readiness

The student QR screen uses native modules for the shareable LEIMA card:

- `expo-media-library`
- `expo-sharing`
- `react-native-view-shot`

After adding or updating those dependencies, always create and install a fresh native development, preview, or store build before testing. Metro reload alone is not enough; an older dev client will not contain `ExpoMediaLibrary`, `ExpoSharing`, or `RNViewShot`.

Manual physical-device smoke:

1. Install the newest iOS or Android native build.
2. Sign in as a student with an active registered event.
3. Open `Oma QR` and confirm the QR face renders without a red screen.
4. Try taking a screenshot while the QR face is visible; it should be blocked or hidden by the OS/app protection.
5. Flip to the LEIMA card side and confirm the QR code is no longer visible.
6. Take a screenshot of the LEIMA card side; this side may be capturable because it contains no QR token.
7. Tap `Save image` / `Tallenna kuva`, grant photo permission, and confirm the image appears in Photos/Gallery.
8. Repeat the save path after denying photo permission and confirm the app shows a clear error instead of false success.
9. Tap `Share card` / `Jaa kortti` and confirm the native share sheet opens.
10. Share to a real target such as Messages, WhatsApp, Instagram, or Files and confirm the shared image contains only the leima card, not the QR code or token.
11. Flip back to QR and confirm a fresh QR is generated and scanner flow still works.

## Mobile hosted business scan readiness

For the hosted one-device student-to-scanner smoke wiring:

```bash
npm run qa:mobile-hosted-business-scan-readiness
```

This focused audit currently does four things in order:

1. `npm --prefix apps/mobile run lint`
2. `npm --prefix apps/mobile run typecheck`
3. `npm --prefix apps/mobile run export:web`
4. `npm --prefix apps/mobile run audit:hosted-business-scan-readiness`

The audit is intentionally read-only. It verifies the current repository state still supports the hosted scanner smoke path:

- the active student event screen still ships the live QR scene
- the business scanner still ships the camera-based QR scan surface
- the business password sign-in flow still exposes the operator login path needed to reach that scanner
- the docs still describe the current hosted smoke flow honestly

The preferred camera-based scanner smoke sequence is:

1. sign in as the student on the physical iPhone
2. open `My QR`
3. show the live QR to the scanner flow
4. sign in as the scanner account
5. open `Business > Scanner`
6. scan the QR with the scanner camera

That path still exercises the real hosted `scan-qr` backend. If camera scanning is not practical in CI or repo-owned smoke, use a dedicated script instead of exposing a token paste control in the staff UI.

## Mobile native simulator and emulator wiring

For the pre-device simulator and emulator wiring gate:

```bash
npm run qa:mobile-native-simulator-smoke
```

This focused wrapper currently does static/repo checks and then the executable native simulator launch smoke in order:

1. `bash -n apps/mobile/script/build_and_run.sh`
2. `cd apps/mobile && ./script/build_and_run.sh --help`
3. `npm --prefix apps/mobile run lint`
4. `npm --prefix apps/mobile run typecheck`
5. `npm --prefix apps/mobile run export:web`
6. `npm --prefix apps/mobile run audit:native-push-device-readiness`
7. `npm --prefix apps/mobile run audit:native-simulator-smoke`
8. `npm --prefix apps/mobile run smoke:native-simulators`

The audit verifies that the repository exposes both a stable local run path and an executable launch-smoke path before the final physical-device push check:

- `apps/mobile/script/build_and_run.sh` supports `--ios`, `--android`, `--dev-client`, `--web`, `--doctor`, and `--export-web`
- `apps/mobile/scripts/smoke-native-simulators.mjs` can run Android emulator and iOS simulator launch smoke
- `apps/mobile/.codex/environments/environment.toml` exposes matching Codex actions
- the existing native push diagnostics audit is still present
- docs stay explicit that simulator or emulator smoke does not prove real APNs or FCM-backed delivery

When local Android SDK and Xcode simulator tooling are available, the wrapper above runs the executable smoke. To repeat only that heavy launch portion, run:

```bash
npm --prefix apps/mobile run smoke:native-simulators
```

That command builds and launches the release app on Android emulator and iOS simulator, captures launch screenshots/log artifacts under `/tmp/omaleima-native-smoke`, and fails on crash markers or missing startup UI markers where the platform exposes them.

Expected success output today:

- `native-simulator-wiring:repo-wired`
- `codex-run-actions:present`
- `dev-client-entrypoint:present`
- `native-launch-smoke:scripted`
- `docs:aligned`
- `native-simulator-smoke:passed`

This gate still does not prove remote push delivery. The executable smoke improves launch/crash confidence on simulators, while APNs/FCM delivery and camera behavior remain physical-device checks.

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
