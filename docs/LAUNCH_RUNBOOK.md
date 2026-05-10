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
- business scanner sign-in with a hosted password account
- real hosted `scan-qr` execution through the mobile scanner fallback
- stamp creation plus reward-unlock push delivery through the real product path
- Android emulator app-flow smoke through Expo Go
- Android emulator business email/password sign-in
- hosted placeholder pilot operator accounts are bootstrapped with random passwords
- hosted fixture operator accounts are archived and the hygiene audit is green
- hosted local secret/password hygiene audit is green for the current Desktop credential file

Additional release hardening verified on `2026-05-10`:

- organization event update/cancel and club department tag update/delete use hardened RPCs instead of final direct writes
- mobile organizer event create/edit-save RPC smoke passes with the seeded organizer account against local Supabase
- hosted Supabase migration history reports up to date; organization RPC drift was corrected by reapplying the idempotent migration SQL and verifying the four RPCs exist
- Edge Functions importing changed shared HTTP/JWT helpers were redeployed and are active in the hosted project
- mobile reward notification bridge audit is aligned with the current UX: reward unlock/new-stamp foreground feedback uses the in-app celebration flow, stock changes use local foreground notifications, and remote reward-unlocked push is backend-owned
- admin production CSP no longer includes `unsafe-eval`; the remaining `unsafe-inline` allowance is tracked as a future nonce/hash hardening item

What is **not** yet fully verified:

- Android remote-push physical-device smoke
- Android student Google sign-in on a real Android development build
- physical-device mobile organizer edit/save UI tap-through on a staging/native build
- public App Store or Play Store distribution
- public custom domain cutover
- real club/operator email identities replacing the current placeholder pilot operator emails

## Priority matrix

### Must-have before a private pilot

1. Replace temporary hosted smoke accounts with real operator credentials.
2. Run the repo-owned final dry-run with those real operator accounts.
3. Keep the local operator credential file under strict permissions and rerun the secret/password hygiene audit after any manual edit or rotation.
4. Keep iPhone as the already-proven student and push path if Android remote push is still unverified.
5. Confirm the first pilot club, event, venue list, and scanner roster.
6. Replace the current placeholder pilot operator emails with the real club/operator emails once the first pilot club is known.

### Needed before a broader public launch

1. Android remote-push physical-device smoke
2. Android student Google sign-in proof on a real Android development build
3. Final custom domain cutover
4. Public store-release steps
5. Final hosted secret rotation and stronger operator credentials everywhere
6. Expo store/public-launch readiness gate stays green
7. iOS login policy gap closed: because the student primary account currently uses Google login, add Sign in with Apple or another equivalent privacy-preserving login option before App Store submission.

### Later

1. Full mobile UI redesign and broad visual polish
2. Broader launch marketing assets
3. Non-critical convenience tooling that does not change pilot risk

## Owner action items

These are the next user-owned tasks outside the repo. Split them into “needed before a private pilot” and “can wait until a broader public launch.”

### Needed before a private hosted pilot

1. Decide the first real pilot club, event, venue list, and scanner staff roster.
2. Confirm the hosted Supabase project is the one you want to keep using for the pilot.
3. Replace the current placeholder pilot operator emails with the real club/operator emails when the first real pilot club is ready.
4. Set the final hosted secrets and rotate any weak placeholder values.
5. Run one last pilot dry-run with the current operator accounts before the event date.
6. Run `npm --prefix apps/admin run audit:pilot-operator-hygiene` and make sure it stays green after the real-operator swap.
7. Run `npm --prefix apps/admin run audit:pilot-secret-hygiene` after any password rotation or credential-file move.

### Can wait until later

1. Buying the final custom domain
2. Moving Supabase Auth off the temporary preview URL
3. Public App Store submission
4. Public Play Store submission
5. Full visual polish pass across the whole mobile UI

## Observability, alerts, and recovery

Production launch should have an error-observation path, but Sentry is not mandatory. The low-cost private-pilot baseline is Vercel deployment logs, Supabase Edge Function logs, Supabase database logs/advisors, and GitHub Actions notifications. Sentry or an equivalent provider can be added later by setting `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and `EXPO_PUBLIC_SENTRY_DSN` in Vercel, EAS, or the local native build environment; keep them empty locally when no provider is used.

Minimum private-pilot alert routing:

1. Web dashboard runtime errors: Vercel logs and GitHub/Vercel deployment notifications; add Sentry/equivalent alerting when the owner chooses a provider.
2. Mobile crashes: device logs/TestFlight or Play Console crash reports for a private pilot; add Sentry/equivalent mobile alerts before broader public distribution if budget allows.
3. Supabase Edge Function failures: Supabase function logs checked after each event-day dry run and after the first live scan window.
4. Deployment failures: GitHub Actions and Vercel deployment notifications monitored before any pilot window.

Recovery expectations:

1. Vercel rollback: promote the previous known-good deployment from the Vercel dashboard, then rerun hosted admin smoke.
2. Supabase schema rollback: do not rewrite migrations; use a forward hotfix migration or Supabase point-in-time restore if data loss occurs.
3. Edge Function rollback: redeploy the previous commit's function bundle, then run QR/reward/push smoke.
4. Mobile rollback: raise `mobile_release_requirements` to block unsafe builds, then distribute a fixed native build through EAS or local Xcode/Gradle archive upload to TestFlight/Play internal track.
5. Database restore: use Supabase automated backups/PITR according to the active paid plan; after restore, rerun the release gate and event scan/reward smokes before reopening live use.

## Store/public launch owner checklist

These are not required for the current private pilot path. They matter when we start the broader public launch track.

1. Create the real App Store Connect app record for `fi.omaleima.mobile`.
2. Create the real Google Play Console app record for `fi.omaleima.mobile`.
3. Prepare store listing copy, screenshots, app icon marketing assets, privacy-policy URL, and support URL.
4. Confirm the privacy policy URL covers the mobile app, QR/leima/reward data, push tokens, scanner location proof, account deletion, and data deletion.
5. Confirm the mobile app exposes Privacy and Terms links on the login screen and signed-in profile/settings surfaces.
6. Confirm the privacy policy page is the Google Play web resource for account deletion and associated data deletion requests.
7. Add Sign in with Apple or another equivalent privacy-preserving login option before submitting the Google-login student app to App Store Review.
8. Confirm Android release manifest hygiene before uploading the AAB: `SYSTEM_ALERT_WINDOW` and `RECORD_AUDIO` are blocked, and Android backup is disabled.
9. Confirm App Store Connect privacy nutrition labels match the Expo `ios.privacyManifests` collected-data declarations and the public privacy notice.
10. If using the local generated iOS workspace, run `OMALEIMA_STORE_BUILD=1 npx expo prebuild --platform ios --no-install`, then `pod install` from `apps/mobile/ios`, and confirm `apps/mobile/ios/OmaLeima/PrivacyInfo.xcprivacy`, `apps/mobile/ios/OmaLeima/Info.plist`, and `apps/mobile/ios/Podfile.lock` are aligned before any Xcode archive. The generated iOS plist must not keep Expo Dev Launcher Bonjour/local-network keys or unused Always/background location keys.
11. Decide the first submission path:
   - iOS through TestFlight first
   - Android through an internal track first
12. Configure the final Apple and Google submission credentials outside the repo.
13. Run the repo gate before any submission work:
   - `npm run qa:mobile-store-release-readiness`
14. Choose the native release path:
    - EAS Build + Submit when quota/subscription is available.
    - Local Xcode archive / Gradle release build + manual App Store Connect / Play Console upload when EAS is unavailable.
15. For EAS, keep the required Expo EAS environment variables present for `development`, `preview`, and `production`; for local builds, keep the same public env values in the local release environment and run the store gate with `OMALEIMA_NATIVE_RELEASE_MODE=local`.

## Mobile edge security boundary

Cloudflare WAF protects the web app and public website when traffic enters through the Cloudflare-managed domain. Direct Supabase mobile traffic is not protected by Cloudflare WAF, because the native app calls Supabase Auth, Realtime, Storage, and Edge Functions over the Supabase project URL.

Current mobile security controls therefore must stay server-side and source-of-truth based:

- Supabase Auth validates the user session on every protected request.
- RLS and security-definer RPCs own data authorization; UI hiding is never the permission boundary.
- QR scan, stamp, reward, fraud, and audit writes stay behind Edge Functions or atomic database functions.
- Dashboard and mutation routes keep explicit rate limits.
- Draft event and announcement media now stage in the private `media-staging` bucket and are copied to public buckets only when published.
- Signed staging URLs are preview-only and short-lived.

Do not put static Cloudflare bypass secrets or service-role secrets into the mobile app. If we need Cloudflare-level protection for mobile mutations later, the production architecture should route selected mobile write endpoints through a Cloudflare Worker or API gateway on an OmaLeima domain, then forward to Supabase with normal user JWT validation plus Worker-side bot/rate controls. Supabase Auth and Realtime can remain direct unless we intentionally redesign those flows.

## Supabase branded API/Auth/Storage domain

If Google login or image URLs still show `*.supabase.co`, that is expected until Supabase Custom Domains is activated for the hosted project. Cloudflare or Vercel custom domains for the web app do not change Supabase Auth callback URLs or Storage public URLs.

Launch timing note: Supabase Custom Domains requires a paid Supabase plan and the Custom Domain add-on, currently planned as a final store/web launch expense. Do not block development on this. Pay for the Pro plan plus the custom domain add-on when the app is otherwise ready to submit to App Store, Google Play, and production web.

Use one Supabase API hostname, for example `https://api.omaleima.fi`, for Auth, Realtime, Edge Functions, and Storage:

1. Enable Supabase Custom Domains for the production project from the Supabase dashboard or CLI.
2. Add the DNS CNAME from `api.omaleima.fi` to the current Supabase project hostname.
3. Add the required ACME/TXT verification record and wait for Supabase certificate activation.
4. Add both callback URLs in Google Cloud OAuth during the cutover: the old `https://<project-ref>.supabase.co/auth/v1/callback` and the new `https://api.omaleima.fi/auth/v1/callback`.
5. After activation, set production `NEXT_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_URL` to `https://api.omaleima.fi`, rebuild web/mobile, and rerun OAuth + public Storage URL smoke.
6. Keep the old project hostname available during rollout, but do not store new public media URLs with the old hostname after the env cutover.

## Senin icin kisa not (TR)

Bu bolum sadece sana yonelik kisa ozet. Ana teknik akis degismiyor.

### Su an yapmana gerek yok

- Gercek kulup bulmak veya kulup ile gorusmeye baslamak
- Gercek organizer/scanner hesaplari acmak
- Domain satin almak
- App Store veya Play Store yayiniyla ugrasmak
- Tum UI'i bastan tasarlamak

### Uygulama biraz daha tamamlandiginda senden istenecekler

1. Gorusecegin ilk kulubu secmek
2. Desktop'taki `/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt` dosyasini guvenli bir yere tasimak
3. O kulup icin gercek organizer hesabini acmak
4. Gercek scanner/staff hesaplarini acmak
5. Ilk pilot etkinlik ve venue listesini netlemek
6. Hosted secret ve sifreleri nihai degerlere cevirmek
7. Public launch yaklastiginda App Store Connect ve Google Play Console kayitlarini acmak

### Su an teknik olarak dogru siramiz

1. Ana gelistirme akisina devam
2. Android emulator ile business login / event / QR / scanner akislarini dogrulamak
3. Android student Google login ve Android remote push'i ancak Android development build veya fiziksel cihaz yolu oldugunda kapatmak
4. Launch ve operasyon checklist'ini net tutmak
5. En sonda toplu UI polish ve public launch isi

### Store/public launch notu

Store hazirligi icin repo icinde artik ayri bir gate var:

- `npm run qa:mobile-store-release-readiness`

Bu gate sadece bizim repo tarafindan dogrulanabilecek kisimlari kontrol eder. App Store Connect veya Google Play Console icindeki gerçek listing, screenshot, privacy policy, support URL ve submission credential adimlari daha sonra owner isi olarak yapilacak.
Repo tarafinda buna ek olarak varsayilan EAS release modunda Expo EAS environment variable isimlerinin `development`, `preview`, `production` icinde var olup olmadigi kontrol edilir. EAS kullanilamayacaksa ayni gate `OMALEIMA_NATIVE_RELEASE_MODE=local` ile calistirilir ve native build/distribution manuel Xcode/Gradle + store console adimi olarak takip edilir.
Mobil uygulama icinde Privacy/Terms linkleri login ekraninda ve profil/ayarlar yuzeylerinde gorunur olmali. Google Play account deletion icin privacy sayfasindaki "Account and data deletion requests" bolumu web kaynak linki olarak kullanilir.
Hosted active mobile login slides da store gate'inin parcasidir: aktif slide varsa Fince/İngilizce copy launch-ready olmali, placeholder/test metin icermemeli ve image URL HTTPS olmali. Aktif slide yoksa mobil uygulama local fallback onboarding slide'larini kullanir.

iOS icin ayrica dikkat: ogrenci birincil girisi Google ile oldugu surece App Store submission oncesinde Sign in with Apple veya Apple'in kabul edecegi esdeger gizlilik-koruyucu giris secenegi eklenmeli. Bu repo gate'i bu riski belgelemeyi kontrol eder, ama Apple provider credential kurulumunu tek basina kanitlamaz.

### Expo EAS / local native release notu

Store/public launch gate’i varsayilan modda Expo EAS CLI auth bekler ve `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ve `EXPO_PUBLIC_EAS_PROJECT_ID` isimlerinin `development`, `preview`, `production` ortamlarinda mevcut oldugunu read-only kontrol eder; degerleri loglamaz. EAS limiti/subscription yoksa bu blocker degildir: `OMALEIMA_NATIVE_RELEASE_MODE=local npm --prefix apps/mobile run audit:store-release-readiness` komutu repo-owned gate'i calistirir, native artifact ise local Xcode/Gradle release build ile uretilip store console'a manuel yuklenir.

### Android telefon yoksa ne olacak

Bu durumda Android icin tamamen durmuyoruz.

Simdilik:

- Android emulator ile urun akislarini deneriz
- business login, event, QR ve scanner ekranlarini dogrulariz
- ama Android remote push'i tam dogrulandi saymayiz

Ek not:

- Android emulator + Expo Go yolunda student Google login'i tam dogrulama saymayiz
- bu kisim ancak Android development build veya gercek cihaz yolu ile kapanir

Yani Android tarafinda kalan risk:

- gercek cihaz uzerinden remote push teslimati
- notification'a dokunup app'e donus davranisi

Bu risk, Android public launch hedeflenene kadar parkta kalabilir.

### Kulup yoksa bugun problem mi

Hayir. Su an hic kulube sahip olmaman blokaj degil.

Bu proje icin bugun kritik olan sey:

- urunun teknik omurgasini bitirmek
- private pilot oncesi neyin eksik oldugunu net tutmak
- kulup gorusmelerini uygulama yeterince hazir oldugunda baslatmak

## Temporary fixture credentials

The following accounts exist only to support hosted smoke and manual validation. They must not survive into a real pilot unchanged:

- `organizer@omaleima.test`
- `scanner@omaleima.test`
- `admin@omaleima.test`
- any account still using `password123`

Current bootstrap output on this workstation:

- `/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt`

Before a private pilot with a real club:

1. keep the generated operator file somewhere safer than the Desktop
2. replace the placeholder pilot operator emails with the real club/operator emails
3. verify access with those accounts
4. rotate any shared passwords used during development

Current repo-owned operator gate:

- `npm run qa:private-pilot-final-dry-run`
- `npm --prefix apps/admin run run:pilot-final-dry-run`

Current repo-owned local secret gate:

- `npm run qa:pilot-secret-hygiene`
- `npm --prefix apps/admin run audit:pilot-secret-hygiene`

## Private-pilot go or no-go gate

Treat the project as ready for a **private hosted pilot** only when all of the following are true:

- hosted admin verification passes
- local QA gates still pass
- iPhone student flow passes
- iPhone scanner flow passes
- remote reward-unlock push is seen on the physical device
- `audit:pilot-operator-hygiene` passes on the hosted project
- `audit:pilot-secret-hygiene` passes on the current Desktop credential file
- current pilot operator credentials are in place
- `qa:private-pilot-final-dry-run` passes on the current Desktop credential file
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
   - `npm --prefix apps/admin run audit:hosted-setup` (checks the same required Vercel env names as the hosted build gate)
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
12. Pilot operator hygiene audit is green:
   - `npm --prefix apps/admin run audit:pilot-operator-hygiene`
13. Pilot secret/password hygiene audit is green:
   - `npm --prefix apps/admin run audit:pilot-secret-hygiene`

## Hosted staging notes

- Vercel preview deployments use Preview environment variables by default.
- If you create a dedicated Vercel custom environment such as `staging`, deploy with `vercel deploy --target=staging` and pull matching variables with `vercel pull --environment=staging`.
- The admin app now runs a hosted env prebuild check on Vercel. If `NEXT_PUBLIC_SUPABASE_URL` still points at localhost or the publishable key is still an example placeholder, the build should fail immediately.
- The admin app now also has a read-only readiness audit. Run `npm --prefix apps/admin run audit:hosted-setup` after linking the real project or rotating secrets so the next hosted verification does not fail late.
- The admin app now also has a read-only pilot operator hygiene audit. Run `npm --prefix apps/admin run audit:pilot-operator-hygiene` before a private pilot to catch leftover `@omaleima.test` operator accounts and any active club/business memberships still tied to them.
- The admin app now also has a local pilot secret/password hygiene audit. Run `npm --prefix apps/admin run audit:pilot-secret-hygiene` after any manual credential edit, Desktop file move, or password rotation so the file mode, password quality, and required GitHub secret names stay in a known-good state.
- The admin app also now has a read-only Supabase auth-config audit. Run `npm --prefix apps/admin run audit:supabase-auth-url-config` before and after the auth-domain cutover so the live `site_url`, redirect allow-list, and Google OAuth state are verified from the repo.
- The admin app now also has a controlled apply command for the hosted auth-domain switch. Rehearse with `SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run` first; only use `apply` after the DNS and audit gates are green.
- If preview deployments are protected by Vercel SSO, a successful deploy can still return `401` to anonymous smoke checks. Treat that as deployment protection configuration, not as an app regression.
- While the custom domain is not ready, the current preview deployment URL is acting as the temporary Site URL in Supabase Auth. Replace it with `https://omaleima.fi` later in one controlled pass.
- `https://omaleima.fi` is the canonical production admin/public host. Keep `https://admin.omaleima.fi/auth/callback` in the Supabase redirect allow-list only as a transitional legacy callback until the admin subdomain is intentionally retired or reintroduced.
- If preview protection is enabled, make sure the verification workflow can access the URL before treating failures as app regressions.
- If the linked hosted Supabase project was just created, assume it is empty until `supabase db push --linked` has completed and a direct hosted API probe confirms tables like `profiles` and `clubs` are reachable.
- The custom domain is now attached in Vercel, but DNS must keep `omaleima.fi` pointed at Vercel before Supabase Auth can move off the preview URL.
- A matching Vercel DNS record already exists in the Vercel zone. If you want to use it, delegate the domain to `ns1.vercel-dns.com` and `ns2.vercel-dns.com` instead of managing the A record externally.

## Native push smoke handoff

Before asking a human tester to do the final remote push proof on a physical device:

1. `npm run qa:mobile-native-simulator-smoke`
2. `npm run qa:mobile-native-push-readiness`
3. optionally repeat only the heavy native launch portion with `npm --prefix apps/mobile run smoke:native-simulators`
4. confirm `apps/mobile/script/build_and_run.sh --help` works
5. confirm Codex actions inside `apps/mobile/.codex/environments/environment.toml` are present

The first command proves repo-owned wiring and local Android/iOS simulator launch/crash smoke where SDK tooling is available. It still does not prove real APNs or FCM remote push delivery.

At that point the remaining human step should be only:

- install a development build on a physical device
- sign in
- enable notifications from the student profile route
- trigger a real remote reward-unlocked push
- confirm the diagnostics surface shows a remote source for both receipt and response

## Leima card save/share smoke handoff

Before App Store or Google Play submission, install a fresh native build that was produced after `expo-media-library`, `expo-sharing`, and `react-native-view-shot` were added. The QR screen must be tested on a real device because Expo Go or an older dev client can load the JavaScript bundle but still miss the native modules.

Required device proof:

1. QR face opens without `Cannot find native module 'ExpoMediaLibrary'`.
2. QR screenshot or screen recording is blocked while the live QR is visible.
3. LEIMA side can be screenshotted because it contains no QR code.
4. `Save image` requests photo-library permission and writes the card to Photos/Gallery.
5. Permission denial shows an actionable error.
6. `Share card` opens the native share sheet.
7. The saved/shared image does not include the live QR token.
8. Returning from LEIMA to QR generates a fresh QR that the business scanner can validate.

## Physical device verification status

Current reality:

- iPhone development-build smoke: passed
- Android emulator fallback: available for app-flow smoke
- Android emulator business email/password flow: passed
- Android remote-push physical-device smoke: not yet passed
- Android student Google sign-in on a real Android development build: not yet passed

That means a private pilot can still move forward if iPhone is the only supported student and push-proven path for the first event. Android emulator coverage can reduce UI and business-flow risk now, but broader Android rollout should wait until a real Android device or Android dev build verifies the remaining auth and push pieces.

## Custom-domain cutover order

Do the auth-domain cutover in this exact order:

1. `npm --prefix apps/admin run audit:custom-domain-cutover`
2. wait until the audit turns `READY`
3. `npm --prefix apps/admin run audit:supabase-auth-url-config` and confirm it still reports `state:preview-site-url`
4. `SUPABASE_AUTH_CONFIG_APPLY_MODE=dry-run SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain npm --prefix apps/admin run apply:supabase-auth-url-config`
5. `SUPABASE_AUTH_CONFIG_APPLY_MODE=apply SUPABASE_AUTH_CONFIG_APPLY_TARGET=custom-domain npm --prefix apps/admin run apply:supabase-auth-url-config`
6. update Google OAuth allowed origins and redirect notes if they still mention the temporary preview URL
7. rerun `npm --prefix apps/admin run audit:supabase-auth-url-config` and confirm it now reports `state:custom-domain-site-url`
8. rerun hosted admin verification against `https://omaleima.fi`

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
