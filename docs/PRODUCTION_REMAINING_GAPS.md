# Production Remaining Gaps

**Date:** 2026-05-09  
**Branch:** `feature/apple-sign-in-store-release`
**Decision:** Private pilot is feasible with operator supervision. Broad public launch on web, iOS, and Android is not ready until the items below are closed.

This file lists the remaining issues that cannot be fully completed from this workspace alone because they require external provider accounts, physical devices, production credentials, store-console work, paid service setup, or owner/business decisions. Code-side items that can be safely fixed in-repo should not live here as blockers; they should be implemented on the feature branch.

## Current product fit

OmaLeima is aligned with the core Finland student event problem: digital leima collection for appro/pub-crawl/overalls events, short-lived QR scanning, rewards, leaderboards, organizer tools, and admin oversight. The current codebase is strong enough for a controlled private pilot, especially with one known club, known venues, and supervised operator accounts.

The product is not yet ready for broad public launch because launch readiness depends on external verification and production operations that cannot be proven only by repository code.

## External blockers before broad public launch

| Priority | Gap | Why it matters | Owner-side action |
|---|---|---|---|
| P0 | **iOS Apple sign-in provider smoke** | Native Sign in with Apple code is now wired in the mobile app and the Apple Developer App ID `fi.omaleima.mobile` has the capability enabled, but App Store readiness still depends on hosted Supabase Apple provider confirmation and a real iOS/TestFlight sign-in proof. | Confirm the Supabase Apple provider/audience for `fi.omaleima.mobile`, regenerate invalidated provisioning profiles, build iOS, and record a physical Apple sign-in smoke. |
| P0 | **Real-device Android proof** | Physical-device QR scanning has been tested by the owner, but simulator/emulator checks still do not prove Android Google OAuth callback, FCM/Expo remote push delivery, or notification tap routing on actual hardware. The hosted `device_tokens` check currently shows no Android token, so Android background push cannot yet be treated as proven. | Test an Android development/internal-track build on a physical Android device, allow notifications, confirm a hosted Android token is created, and record remote push + tap-routing evidence. |
| P0 | **Real-device iOS/TestFlight proof** | Physical-device QR scanning has been tested by the owner, but iOS simulator screenshots still do not prove APNs delivery/tap, TestFlight install behavior, share/save sheets, Photos permission, or store-signed keychain behavior. Hosted DB currently has enabled iOS push tokens, but that is token evidence, not full store-signed TestFlight proof. | Test a TestFlight or development build on a physical iPhone and record the result. |
| P0 | **Store-console readiness** | App Store Connect and Google Play Console records, listing assets, privacy labels, submission credentials, and review steps are external to this repo. | Create store records, upload final screenshots/copy, configure privacy/support URLs, and set submission credentials outside the repo. |
| P1 | **Production observability path** | The master plan expects crash/error monitoring. Sentry is optional, but the owner still needs an explicit alert/log review process for event-day incidents. | For private pilot, monitor Vercel logs, Supabase logs/advisors, GitHub Actions, and store crash reports manually. Before broader launch, optionally choose Sentry or an equivalent provider, set production secrets, and define alert recipients. |
| P1 | **Production custom domain cutover** | Supabase Auth, Storage, Realtime, and Edge Function URLs still require a Supabase custom-domain setup if final branded API/Auth URLs are desired. This may require a paid Supabase plan/add-on. | Activate Supabase Custom Domains, configure DNS, update OAuth callback URLs, rotate env vars, rebuild clients, and smoke OAuth/media URLs. |
| P1 | **Real operator credentials** | Placeholder or fixture operator accounts are acceptable for local/hosted smoke, but not for a real pilot. | Pick the first pilot club, final venue/scanner roster, and replace placeholder emails/passwords with real operator identities. |
| P1 | **Production secret rotation** | Final Supabase, Expo, Vercel, OAuth, and store credentials must be rotated and stored outside the repo before public launch. | Rotate hosted secrets, keep credential files outside git, and rerun the repo's pilot secret/operator hygiene audits. |
| P1 | **Backup/restore and incident procedure** | Repository code cannot prove disaster recovery. Production needs a tested restore path and owner-facing incident process. | Define RTO/RPO, confirm Supabase backup coverage, run a restore drill in a safe environment, and document who responds during event day incidents. |
| P2 | **Chrome extension test path** | The Codex Chrome Extension backend repeatedly failed with `Browser is not available: extension`; Playwright fallback is usable but not the requested Chrome-extension path. | Reinstall/repair the extension/native host locally and rerun browser checks if Chrome-extension evidence is required. |

## Operational gaps to decide before scaling

1. **Business owner vs business staff model:** The app has working business scanner/event/report surfaces, but self-serve owner staff management is still a product decision. For a private pilot, manual admin-created staff accounts are acceptable. For scale, decide whether owners need staff invites, scanner device reset, role assignment, and business dashboard controls.
2. **Club staff role depth:** Organizer surfaces are strong, but a lighter staff-only reward/claim operator mode may be needed for larger events where many volunteers validate rewards.
3. **Paid plan and cost decisions:** Supabase custom domains, observability, and store operations may introduce recurring costs. Decide these only when moving from private pilot to public launch.

## Notification/background push proof state

- Physical-device QR scanning has been owner-tested on real devices and is no longer tracked as an open QR/camera proof blocker in this file.
- Sign in with Apple capability was enabled in Apple Developer for App ID `fi.omaleima.mobile` on 2026-05-09. Apple showed the standard warning that provisioning profiles must be regenerated after the capability change.
- Hosted `public.device_tokens` was checked without printing token values: **2 enabled iOS tokens across 2 users** were present, with latest `last_seen_at` on 2026-05-09 UTC.
- Hosted `public.device_tokens` currently has **0 Android tokens**. Android background/closed-app remote push remains unproven until a physical Android development/internal build registers a token and receives a remote notification.
- Background or closed-app delivery is not a purely code-side property: it requires a native build, OS notification permission, an enabled Expo push token in Supabase, Expo/APNs/FCM delivery, and tap-routing confirmation on the physical device.

## Launch position

- **Private pilot:** feasible after real operator accounts are configured and the final hosted dry-run passes.
- **Public iOS launch:** blocked until hosted Apple provider confirmation and physical-device/TestFlight Apple sign-in + push proof are closed.
- **Public Android launch:** blocked until real Android OAuth, push, and camera QR proof are closed.
- **Public web launch:** technically close, but should not be declared production-ready until release traceability, observability, incident handling, and final hosted smoke evidence are complete.
