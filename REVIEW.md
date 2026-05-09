# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review (Mobile Organizer Edit + Student Header/Rewards UX)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix three user-reported mobile issues without changing the validated scanner/business flow: club organizer event edit should open the real edit form with the selected event, the student rewards hero count must render fully without clipping, and the student profile header button must register taps reliably.

## Mobile Organizer Edit + Student Header/Rewards UX Findings

- The organizer "Approt" screen lives in `apps/mobile/src/app/club/events.tsx`. Its action sheet already sets `mode="edit"` and seeds the selected event draft, but a follow-up effect resets the form back to create mode whenever there is no route `eventId`, which explains why tapping **Muokkaa** opens the new-event form instead of the edit form.
- The student rewards clipping issue is on `apps/mobile/src/app/student/rewards.tsx`. The summary count uses very large typography inside an overflow-hidden hero card with a tight line height and no extra inset, so single-digit counts like `0` can clip at the top/right edge on iOS.
- The student profile header CTA is shared through `StudentProfileHeaderAction`. Because it sits in scrollable headers on multiple student tabs, a small visual button without extra hit slop can feel unreliable; expanding the touch target centrally is the safest fix without altering layout.

## Current Review (Role/Security Flow Completion)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Kullanici staff/business owner scanner akisini fiziksel cihazlarda dogruladigini belirtti. Bu turda calisan owner/staff QR akisini yeniden tasarlamadan, subagent destekli sekilde kalan repo-ici guvenlik ve UX aciklarini kapat.

## Role/Security Flow Completion Findings

- Business owner/staff flow'un urun davranisi korunmali: OWNER/MANAGER scanner QR olusturur; SCANNER hesaplari sadece ilgili isletmenin aktif etkinlik QR'larini okur. Bu model degistirilmeyecek.
- UI audit, mobile app'te cok sayida query/mutation alaninin raw `error.message` gosterdigini buldu. Bu production'da DB/RPC/provider detaylarini kullaniciya sizdirabilir; cozum calisan akis yerine localized, kullanici-guvenli fallback mesajlari kullanmak.
- UI audit ayrica student event join ve club reward handoff butonlarinin global mutation pending state ile tum kartlari ayni anda disable ettigini buldu. Bu davranis islevi bozmaz ama event-day operasyonunda belirsiz feedback yaratir; item-scoped loading ile duzeltilecek.
- Role audit, join akisi OWNER/MANAGER ile sinirliyken `leave_business_event_atomic` icinde ayni role kontrolunun olmadigini buldu. SCANNER'in event yonetimi yapamamasi invariant'i leave icin de ayni olmali.
- Role/Supabase audit, Edge Function response details icinde DB/provider `error.message` alanlarinin donduruldugunu buldu. Bu detaylar server log'a alinabilir, ama HTTP response'ta generic context kalmali.
- Supabase audit'in `claim_reward_atomic` bulgusu urun akisi acisindan blocker olarak alinmadi: kulup gorevlisinin event kapsamindaki ogrencinin odulunu teslim etmesi tasarimin kendisi. Mevcut RPC reward tier'in event'e ait oldugunu, claimer'in event kulubunde aktif oldugunu, ogrencinin yeterli valid stamp'i oldugunu ve `(event_id, student_id, reward_tier_id)` unique constraint'ini dogruluyor.

## Current Review (QR Rate Limit Hosted Apply + UX)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Apply the QR-specific Supabase limiter to hosted Supabase if CLI credentials allow it, deploy the updated `generate-qr-token` Edge Function, and make the rare mobile `QR_RATE_LIMITED` state user-friendly.

## QR Rate Limit Hosted Apply + UX Findings

- The dedicated QR limiter is intentionally generous and should not be visible in normal use. If it ever appears, it likely means a reconnect/remount loop or a very fast retry burst, not that the user did something wrong.
- The active QR screen currently renders `qrTokenQuery.error.message` directly. For `QR_RATE_LIMITED`, that would expose backend phrasing even though the right UX is calm: keep the screen open and let the automatic refresh catch up.
- Hosted Supabase is linked to project `jwhdlcnfhrwdxptmoret`. The migration can be applied with Supabase CLI if the local session has permissions. If CLI auth fails, the migration/function deployment must be left as a clear handoff item.

## Current Review (QR Generation Rate-Limit Tuning)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Revisit the newly added QR token rate limit so it matches the real product flow, then replace the generic dashboard mutation limiter with a dedicated Supabase-backed QR burst limiter that does not break normal student QR refresh behavior.

## QR Generation Rate-Limit Tuning Findings

- The current mobile QR screen uses `useGenerateQrTokenQuery` with `refetchOnMount: "always"`, `refetchOnReconnect: "always"`, and a token-driven interval that refetches when the current token expires. In `_shared/qrJwt.ts`, QR TTL is 45 seconds and `qrRefreshAfterSeconds` is 30 seconds, so normal use already expects regular regeneration.
- The last change reused `check_dashboard_mutation_rate_limit`, which is semantically correct for abuse protection but too generic for QR generation. The user wants a QR-specific Supabase policy that reflects product cadence and does not accidentally throttle legitimate QR refreshes.
- A dedicated QR limiter should focus on **burst protection**, not low steady-state throttling. Normal student usage is one request roughly every 30-45 seconds while the QR screen is active; the real risk is a tight retry loop, duplicated clients, or abuse scripts calling the Edge Function many times in a few seconds.
- A dedicated table/function pair under Supabase keeps the control explicit and auditable without coupling QR flow to admin dashboard mutation scopes.

## Current Review (Production Gap Report + Git Cleanup)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Convert the subagent production-readiness findings into a clear committed report, clean release traceability by grouping the accumulated dirty branch into logical commits, and fix only code-side issues that can be safely completed from this workspace without external provider setup.

## Production Gap Report + Git Cleanup Findings

- The product direction is sound for Finnish student appro/pub-crawl events, but public launch remains blocked by external/provider tasks: iOS Apple login policy, real-device store smoke, custom-domain/store-console setup, production observability provider setup, and final operator credentials.
- The user explicitly does not want Apple login or Sentry implementation in this slice. Those items should be documented as remaining outside-work/backlog rather than partially wired.
- Release traceability is the local issue that can be fixed here: the branch has many modified files and untracked forward migrations. These should be staged into intentional commits, while generated screenshots/output folders should be ignored rather than committed.
- Safe code-side work from this environment should avoid broad refactors. Prioritize small backend hardening that does not require external credentials, such as rate-limit coverage for QR token generation if the existing rate-limit table/RPC can be reused.
- Do not rewrite historical migrations or reset the worktree. Preserve already-applied forward migration files so a clean checkout can match hosted/local database state.

## Current Review (Final Production Readiness Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Re-run a final production-readiness pass over the current dirty release branch using focused subagents, existing admin/mobile/Supabase/Edge validation gates, Chrome skill retry, Computer/simulator inspection, Expo/iOS/Android smoke evidence, and only minimal fixes for newly discovered release blockers.

## Final Production Readiness Sweep Findings

- The latest handoff already reports successful hosted Supabase migration apply, `send-announcement-push` deploy, Vercel production deploy, admin Playwright smokes, mobile static/export gates, Supabase local lint/migration gates, and native launch/render checks. This pass must verify those claims, not assume them.
- The branch remains intentionally dirty with large accumulated release work and untracked forward migration files. Do not revert unrelated work or rewrite migration history that may already be applied locally/hosted.
- Chrome extension communication previously failed with `Browser is not available: extension` even while local install/native-host checks passed. Retry the Chrome skill path once; if it still fails, document the plugin blocker and rely on project Playwright smokes for web evidence.
- Physical-device-only flows are now user-tested: Google OAuth callback, camera QR scan, APNs/FCM push delivery/tap, share/save sheet, Photos permission, and screenshot protection. Local simulator checks should cover launch/render/regression behavior only.
- Highest-risk re-check surfaces are announcement push repeatability/audit/no-target behavior, admin cookie-authenticated mutation hardening, private media staging ownership guards, FK index/search-path migrations, business event detail navigation, native login/startup, and admin review dashboards.

## Current Review (Full Production Verification Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Run a broad production verification pass across the already-dirty release branch: admin web, Expo mobile, Supabase migrations/RLS/Edge Functions, Chrome-admin checks, Computer/simulator checks, Expo/iOS/Android validation, and subagent-assisted review.

## Full Production Verification Sweep Findings

- The branch intentionally contains many prior changes and untracked migration files. This sweep must not revert unrelated work or rewrite already-applied migration history.
- The previous hosted deploy proved repeatable announcement push behavior with durable attempt rows, but a final local/hosted sanity pass should still verify that `ANNOUNCEMENT_ALREADY_SENT` is not reachable through current code paths.
- Chrome previously failed to communicate with the Codex Chrome Extension even after extension/native-host checks. This sweep should retry the Chrome skill workflow once and record the blocker precisely if it persists.
- `serve-sim` is already running on `http://localhost:3200`; keep it available for simulator/web inspection instead of restarting unless the process is gone.
- The user's physical-device tests cover Google OAuth callback, camera QR scan, APNs/FCM push delivery/tap, share/save sheet, Photos permission, and screenshot protection. Simulator QA should focus on launch/render/regression evidence and must not re-label physical-only coverage as simulator-proven.
- The highest-risk surfaces for this pass are cookie-authenticated admin mutation routes, recent media staging DB triggers, announcement push delivery/audit lifecycle, business event detail navigation/join-leave handlers, and native startup/login flows.

## Current Review (P2 Durable Push/Media/Index Backlog)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Close the remaining P2 backlog from the production sweep: durable announcement push attempt rows before Expo delivery, DB-level private media staging ownership by club membership, FK index backlog, Chrome admin panel smoke, and `serve-sim` availability check.

## P2 Durable Push/Media/Index Findings

- `supabase/functions/send-announcement-push/index.ts` currently writes `notifications` only after Expo Push returns and writes `audit_logs` only at the end. If Expo send throws or the function crashes between send and DB insert, there is no durable delivery-attempt row proving the push attempt started.
- No separate delivery attempt table exists. A forward migration should add `announcement_push_delivery_attempts`, optionally link `notifications.delivery_attempt_id`, and index the new FK columns so repeat sends remain auditable.
- Private staging DB triggers validate only the staging path shape. They do not verify that the profile UUID embedded in `users/<uuid>/...` is an active organizer/owner for the target club or a platform admin.
- Announcement staging ownership needs two modes: platform announcements require a platform-admin owner; club/event announcements require an active club event editor or platform admin owner.
- Local FK-index query still reports missing indexes across announcement preferences, announcements, audit logs, scanner/device tables, membership/user references, fraud signals, promotions, QR uses, rewards, and stamps. Add explicit `create index if not exists` entries in a forward migration.
- The user has now confirmed physical-device tests for Google OAuth callback, camera QR scan, APNs/FCM delivery/tap, share/save sheet, Photos permission, and screenshot protection. The handoff should move these from open blockers to externally tested evidence.

## Current Review (Production Hardening Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Start a broad release-candidate code review/refactor pass across admin web, mobile/native, Supabase/Edge Functions, browser QA, and simulator QA using requested plugin workflows and subagents.

## Production Hardening Sweep Findings

- Previous production review left two code-fixable blockers open: published media URL fallback/rollback hardening and shared same-origin/CSRF protection for cookie-authenticated dashboard mutation routes.
- Native/browser validation has partial evidence, but must be treated carefully: simulator evidence proves launch/render only, not real device push, camera, OAuth callback, share sheet, Photos permission, or APNs/FCM delivery.
- Chrome plugin communication failed previously with `Browser is not available: extension`; the Chrome skill requires a retry and local extension/native-host checks before falling back or reporting the plugin blocker.
- `qa:mobile-native-simulator-smoke` can be long-running and may hang around iOS install/build steps. It must not be left running at final response time; if it stalls, capture the exact phase and process state.
- The repo has many dirty files and untracked migration files that may be deliberate prior work. Any refactor must be focused, avoid unrelated reverts, and preserve migration history files that already appear in local/remote migration lists.

## Current Review (Production Code Review + Refactor Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Re-review the last three prompt slices, run broad production validation, use requested browser/native tooling where practical, collect subagent findings, and fix high-confidence release blockers without reverting unrelated work.

## Production Code Review + Refactor Sweep Findings

- The latest support-history scroll change made the indicator visible and enabled nested scrolling, but the native `ScrollView` still needs an explicit shrinking/bounded style inside the max-height modal card so long histories scroll instead of being clipped.
- The new business event detail screen correctly replaces the old preview popup route, but its join/leave handlers await `mutateAsync` without catching rejections. React Query will expose the error state, but the async press handler can still create an unhandled promise rejection on native.
- Announcement push is now repeatable and no-device-token-safe at the Edge Function level. The remaining production caveat is physical: a user must have opened the native app and allowed notifications before a remote push can reach the phone while outside the app.
- Database review found the city-scope migration versions are already present in local/remote migration history while their SQL files are still untracked in git. They must be included before release so a clean checkout matches the applied DB history.
- `join_business_event_atomic` enforces city scope and permissions, but concurrent first joins can still race into the `event_venues(event_id, business_id)` unique constraint because the insert path is not conflict-idempotent.
- New city-scope helper functions use default execute grants. Trigger-only/security-definer helpers should revoke public execution, and utility helpers should expose only the roles that need them.

## Current Review (Business Event Detail + Repeatable Announcement Push)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Verify support history scrolling, make announcement pushes repeatable without noisy no-token blockers, and replace business event preview modals with a full detail screen.

## Business Event Detail + Repeatable Announcement Push Findings

- Mobile support `SupportRequestSheet` already wraps the form in a bounded sheet `ScrollView`, and the latest support requests open inside a separate bounded history modal. The history list can scroll internally when there are many support messages, but its indicator is currently hidden, making the behavior less obvious.
- Mobile push registration is configured through Expo notifications and `register-device-token`; remote push can reach users outside the app only after a native app install has registered an enabled Expo device token. Users without an enabled token cannot physically receive remote push, so the send flow should skip those users without turning the whole operation into a scary admin error.
- `supabase/functions/send-announcement-push/index.ts` currently blocks repeat sends when previous notification rows exist and returns `ANNOUNCEMENT_ALREADY_SENT`. This conflicts with the requested admin/organizer behavior: announcements should be sendable repeatedly, with each send creating a fresh delivery/audit attempt.
- The same Edge Function returns a 404 when all resolved recipients lack enabled device tokens. That is useful diagnostics for launch, but in production UI it reads like a broken send. The safer behavior is a successful no-target result with counts, while still making the skipped-token count explicit.
- Admin announcement UI disables the push button when `pushDeliveryStatus === "SENT"` and displays "already sent"; that must change if repeat sends are allowed server-side.
- Business mobile `events.tsx` currently opens a `Modal` preview for active/upcoming/completed/joinable event cards. There is no `/business/event-detail` route, so businesses cannot inspect the event with the same depth as the student event detail surface.

## Current Review (Club Event Cancel Confirm + Announcement Acknowledgement)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Prevent accidental club event cancellations, fix the mobile announcement acknowledgement RLS failure reported from the student popup, and clarify Apple login requirements.

## Club Event Cancel Confirm + Announcement Acknowledgement Findings

- Web organizer `apps/admin/src/features/club-events/components/club-events-panel.tsx` calls `/api/club/events/cancel` directly from both the selected event form and recent events table. The button label is destructive but there is no final confirmation, so it is easy to confuse with closing/cancelling the edit form.
- Mobile organizer `apps/mobile/src/app/club/events.tsx` already confirms the `Delete event` path, but the separate `Cancel event` button in the edit form still cancels immediately.
- Mobile announcement popup `apps/mobile/src/features/announcements/announcement-popup-bridge.tsx` awaits `acknowledgeMutation.mutateAsync` without a `try/catch`; any DB/RLS error becomes an uncaught promise and redbox.
- Announcement acknowledgements currently write directly to `public.announcement_acknowledgements` from the client. The table has an insert RLS policy, but event-scoped visibility and client-side `upsert` make this brittle. A security-definer RPC that checks `auth.uid()` and `can_read_announcement` before writing gives a single audited DB boundary.
- Existing feed/detail acknowledgement callers already catch errors; the popup needs the same non-redbox behavior while still logging the failure with structured context.

## Current Review (Native Simulator Completion + Login Sheet Fix)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Finish remaining city/custom-domain/simulator validation, fix the Android login sheet that visually exposes only the slider/language row, and document the practical SimCam/browser-simulator boundary.

## Native Simulator Completion + Login Sheet Findings

- Android login screenshot shows the mobile login hero correctly, but the auth sheet effectively exposes only `LanguageDropdown`. In `apps/mobile/src/app/auth/login.tsx`, the shared `LanguageDropdown` has `width: "100%"` and is placed inside a horizontal `cardHeader` row next to title copy. On Android this can consume the row and push the real sign-in controls out of the visible sheet. The login sheet should use a vertical header: title/subtitle first, then language selector, then role selector and auth controls.
- Browser mobile-web export exposed direct `expo-secure-store` calls outside the Supabase adapter. Those calls work in native builds but produce `getValueWithKeyAsync is not a function` on web-export login surfaces. Storage must be centralized behind a platform-aware adapter so Browser smoke can test the same auth screen without native-only module calls.
- iOS simulator release smoke initially launched but then stayed on session-restore. Computer Use plus simulator logs showed `ERR_KEY_CHAIN` from SecureStore because the simulator app was built/installed without a deterministic fresh install and without the keychain access group entitlement in the project config. The smoke runner should uninstall previous app data and the iOS target should carry the keychain access group for signed builds.
- The previous iOS simulator launch smoke failed after a long Xcode timeout and produced an incomplete `.app` without a bundle id. The next attempt should clean DerivedData/cache and use the repo smoke runner rather than installing a half-built artifact.
- Browser-in-Codex can render local web/mobile-web targets, but it cannot embed the native iOS Simulator itself unless a separate bridge/server is installed. This repo has Codex native actions and screenshot artifacts, not a checked-in `serve-sim` bridge.
- SimCam is a valid third-party iOS Simulator virtual camera option according to the vendor docs. It can inject QR/image/video sources into AVFoundation, but it is not currently installed here; installing/running a newly acquired GUI camera tool is outside safe automatic execution without explicit user confirmation and license handling.

## Current Review (City Scope + Runtime Warning + Simulator QA)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix the reported student profile navigation regression, noisy announcement realtime/animation warnings, define and enforce city-scoped event rules, explain Supabase custom domain branding, and run the strongest available local web/native smoke checks.

## City Scope + Runtime Warning + Simulator QA Findings

- Student event header uses `router.navigate("/student/profile")`. Hidden tab routes can become a no-op after returning from the same destination; profile access should push a fresh route intent instead of relying on navigate semantics.
- Announcement warning originates from a broad `postgres_changes` subscription to `public.announcements`. The table is in the realtime publication, but broad RLS-protected table subscriptions can still fail with `CHANNEL_ERROR` for some mobile sessions. Push delivery is already handled separately, so the app needs a non-noisy invalidation strategy that does not depend on a fragile broad realtime channel.
- Business event opportunities are already filtered client-side by business city, but `join_business_event_atomic` does not enforce the same invariant. A crafted client could join an out-of-city event unless the RPC rejects it.
- Organizer event creation defaults to the selected club city in mobile, but both mobile and web still pass editable city text. The authoritative rule belongs in `create_club_event_atomic` and event update paths: non-admin club organizers may only create/update events in their club city.
- Students do not have a dedicated `profiles.city` field. Their best current city signal is the primary selected `department_tags.city`. The product-friendly model should prioritize that city while still allowing deliberate all-city discovery because students may travel for events.
- Supabase OAuth/storage URLs showing `*.supabase.co` are expected until a Supabase custom domain is activated and both web/mobile clients use that custom Supabase URL. Cloudflare site protection alone does not rewrite Supabase Auth or Storage hostnames.

## Current Review (Private Media Staging + Mobile Edge Protection)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Replace the draft public-media guard with a full private staging + publish-time public copy model for event and announcement media, and assess mobile Cloudflare-style protection boundaries.

## Private Media Staging + Mobile Edge Protection Findings

- Event and announcement media uploads currently use a single URL field for both preview and persistence. That makes it easy to create public orphan objects when a user uploads but never saves.
- The correct lifecycle needs two separate values: a private staging object path for draft/edit preview and a public object URL only after publish/active save.
- Supabase public bucket URLs cannot be protected by RLS once known. Private staging must use a non-public bucket and short-lived signed URLs for preview.
- Existing public bucket policies already allow authorized organizers/admins to upload final public event/announcement media; staging should add user-owned private paths to avoid cross-tenant reads.
- Web Cloudflare WAF protects `omaleima.fi` traffic, but the mobile app calls Supabase/Auth/Edge endpoints directly. A native app cannot keep a Cloudflare secret. Full Cloudflare parity requires routing mobile API calls through a Cloudflare Worker/API Gateway custom domain; otherwise protection must be enforced in Supabase/Edge Function code with auth, rate limits, stale-build gates, scanner device controls, and RLS.

## Private Media Staging + Mobile Edge Protection Outcome

- Added hosted/private `media-staging` bucket with owner-scoped storage RLS, staging path columns, and DB triggers that reject draft public URLs and non-draft retained staging paths.
- Admin web and organizer mobile event/announcement uploads now stage privately first, show signed preview URLs, and publish by copying to the public bucket only when the record is saved as non-draft.
- Publish/update/delete flows clean replaced public objects and old staging objects.
- Store readiness audit and launch docs now explicitly state that Cloudflare web WAF does not protect direct mobile-to-Supabase traffic; mobile protection remains Auth/RLS/Edge/RPC/rate-limit/stale-build based unless a Worker/API gateway is introduced later.

## Current Review (Public Draft Media Guard)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Close the highest-value remaining media security gap by preventing draft/unapproved event and announcement records from retaining public Supabase Storage URLs.

## Public Draft Media Guard Findings

- `event-media` and `announcement-media` are public buckets. Bucket listing policies are restricted, but a stored public object URL is still directly readable by anyone with the URL.
- Admin and mobile event/announcement forms can upload public media before the final record is published, which lets draft content be exposed if the URL is persisted.
- RLS alone cannot solve this because public bucket object URLs bypass row visibility once generated. The source of truth must refuse public storage URLs on draft rows.
- Existing delete/replacement cleanup helpers already know how to remove public storage objects by URL, so mobile draft saves can clean newly uploaded public objects while web blocks draft uploads before they happen.
- A future complete private-staging design can improve draft preview persistence, but the immediate release guard should be DB-enforced so accidental client regressions still fail safely.

## Current Review (Executable Native Simulator Smoke)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Turn the existing native simulator/emulator audit from wiring-only evidence into an executable Android/iOS launch-smoke path and run it locally where possible.

## Executable Native Simulator Smoke Findings

- `apps/mobile/scripts/audit-native-simulator-smoke.mjs` proved only entrypoint/docs wiring. It explicitly did not prove that Android or iOS could build, install, launch, or avoid startup crashes.
- Local Android SDK tooling is available at `~/Library/Android/sdk`, with `Pixel_9` AVD configured and `adb` available.
- Local iOS simulator inventory is available through Xcode/CoreSimulator; the generated iOS workspace has the `OmaLeima` scheme and the native dependency graph includes recent modules such as `ExpoMediaLibrary`, `ExpoSharing`, `ExpoAudio`, and `react-native-view-shot`.
- Simulators can reduce launch/crash/regression risk, but they still cannot prove camera behavior on real devices, Google OAuth callback behavior on physical iOS/Android, APNs/FCM remote push delivery, Photos permission UX, or real share-sheet behavior.

## Current Review (Native Simulator QA Gate Consolidation)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Make the root mobile native simulator QA command run the executable Android/iOS launch smoke, not only static wiring checks.

## Native Simulator QA Gate Consolidation Findings

- `npm run qa:mobile-native-simulator-smoke` is the command most likely to be used from the repo root before release, but it previously stopped after lint/typecheck/export and `audit:native-simulator-smoke`.
- The executable launch proof lived only in `npm --prefix apps/mobile run smoke:native-simulators`, so a final release pass could accidentally run the root QA command and miss real install/launch/crash validation.
- Local Android and iOS simulator tooling already passed the executable smoke in the previous slice, so promoting that command into the root QA wrapper is practical in this workstation context.
- The direct `smoke:native-simulators` command remains useful for repeating just the heavy native launch portion after a small native-config change.

## Current Review (Mobile Stale Build Enforcement)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Close the stale build half of `REVIEW_RESULT.md` P1-8 and rely on the existing manual fallback runbook instead of implementing an unsafe offline scan queue.

## Mobile Stale Build Enforcement Findings

- `REVIEW_RESULT.md` P1-8 listed two concerns: scanner offline queue/manual fallback and stale build/force-update enforcement.
- `docs/LAUNCH_RUNBOOK.md` already has a named manual fallback process for event-day scanning outages, including allowed cases, required fallback record fields, communication channel, and reconciliation ownership. An offline queue that later writes stamps would weaken QR freshness and duplicate/race guarantees unless backed by a separate reconciliation product.
- The mobile app did not have a runtime minimum version/build gate. EAS remote app version source exists, but installed stale binaries could keep running unless the server can block them.
- Expo Constants exposes source-of-truth app version and native build numbers for standalone builds. A Supabase public read table is enough for runtime enforcement without adding a new backend service.

## Current Review (Production Test Checklist + Performance Gates)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Collect final production test cases in one durable checklist and close the next high-value `REVIEW_RESULT.md` performance finding.

## Production Test Checklist + Performance Gate Findings

- Production-before-release tests are currently spread across `PROGRESS.md`, `docs/TESTING.md`, `docs/LAUNCH_RUNBOOK.md`, and review handoffs. A single checklist file is needed so the final pass can be executed item by item without losing coverage.
- `apps/mobile/src/features/events/student-events.ts` still loads every public `PUBLISHED`/`ACTIVE` event without a DB limit. Client-side timeline filtering removes ended rows after download, but the query itself can grow unbounded.
- `send-announcement-push` already batches Expo Push API sends, but DB lookups for active profiles, preferences, device tokens, and club-wide registrations still use single `.in(...)` calls over potentially large recipient/event id arrays.
- Mobile web export has no budget gate. A future dependency or top-level native import can inflate web output without CI noticing.
- Public media buckets are intentionally public today. Supabase documents public bucket assets as directly accessible through public URLs, so the draft/unapproved media risk needs a separate private staging/publish-copy design rather than a cosmetic RLS-only patch.

## Current Review (Mutation Rate Limit + Scanner PIN Lockout)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Close the next `REVIEW_RESULT.md` security blockers: authenticated admin/organizer mutation rate limiting and scanner PIN brute-force lockout.

## Mutation Rate Limit + Scanner PIN Lockout Findings

- Admin and organizer API mutation routes already resolve the authenticated user before performing writes, but each route makes its own mutation call and there is no shared per-user throttling after auth.
- Public contact form rate limiting is DB-backed, but it is tied to contact submissions/IP hash and cannot be reused for authenticated dashboard mutation scopes.
- A distributed rate limit should live in Postgres because serverless route instances cannot share in-memory counters reliably.
- The scanner PIN check runs inside `scan_stamp_atomic`, which is the right atomic boundary. Wrong PIN currently returns `SCANNER_PIN_INVALID` without recording attempts or locking the device.
- The mobile scanner transport and Edge Function already support structured scan statuses, so adding `SCANNER_PIN_LOCKED` can be done without changing the QR/token contract.

## Current Review (Production Review Result Closure)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Work through `REVIEW_RESULT.md` findings sequentially, close the low/medium-risk release gates that can be fixed safely in this slice, and keep the report checklist updated.

## Production Review Result Closure Findings

- `audit:store-release-readiness` failed only because the audit still expected the old `import("expo-audio")` marker. The current source intentionally uses `requireOptionalNativeModule("ExpoAudio")` before requiring `expo-audio` so stale native builds do not red-screen.
- `audit:realtime-readiness` failed because it expected `supabase.auth.signOut()` exactly. The current session provider uses `supabase.auth.signOut({ scope: "local" })`, which is the safer path for suspended profiles and invalid refresh-token cleanup.
- The touch target findings were literal style values below 44pt/dp. These are safe style-only fixes.
- Web focus indicators were mostly replaced by box-shadow, but `outline: none` still creates a WCAG review risk. Adding visible `:focus`/`:focus-visible` outlines preserves keyboard discoverability.
- `bootstrap-showcase-events` could reset hosted data and inherited a default production Supabase project ref through shared auth-config helpers. Destructive hosted scripts must require explicit target refs and confirmations.
- `supabase/seed.sql` creates predictable local test users. It should refuse to run in a database that already contains real/non-test auth users unless an explicit override is set.

## Current Review (Student Event Detail Debug Rules + Announcement Push Tap)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Remove the leaked `screenshotMode true` technical rule from student event detail, align that screen with dark-only UI, and verify announcement push delivery/tap routing for admin and organizer announcements.

## Student Event Detail Debug Rules + Announcement Push Tap Findings

- Student event detail rendered every `event.rules` key/value pair directly. If an event contains technical keys such as `screenshotMode`, the UI shows raw implementation state like `screenshotMode true`.
- The event detail stylesheet still had light/dark branches even though the app has been simplified to dark-only.
- Announcement push is implemented through the shared `send-announcement-push` Edge Function. Admins can send platform announcements; organizers can send club announcements after active membership verification.
- Push recipient filtering checks announcement audience/event scope, active profile status, announcement notification preferences, and enabled device tokens before sending Expo push.
- Mobile notification tap routing is wired by `AnnouncementPushRouterBridge`, which reads cold-start notification responses and foreground/background response listeners, then opens the role-specific announcement detail screen.

## Current Review (Stamp Card Cap + Empty Leima Reset)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix the reported custom department tag duplicate redbox, prevent scans after an event stamp card is full, and clear hosted Supabase leima/test progress data for a fresh manual test pass.

## Stamp Card Cap + Empty Leima Reset Findings

- Student custom department tag creation still throws when `department_tags_slug_key` collides with a row the mobile client cannot load through the active-tag read path. This can happen when the slug exists but is hidden by status/RLS or when a previous duplicate is not in the active suggestions payload. The app should first attach a visible active/merged tag when possible, then retry with a suffixed slug instead of redboxing.
- `scan_stamp_atomic` checks the per-business stamp limit before inserting, but it does not check the event card total before inserting. It only sets `event_registrations.completed_at` after the new stamp count reaches `events.minimum_stamps_required`. That means a card can show `3/3` and still accept a 4th valid stamp from another venue.
- The hard cap must live inside the Postgres RPC before `qr_token_uses` and `stamps` inserts, not just in mobile UI. Otherwise replay/race/scanner-device paths can still write excess leimas.
- Scanner UI and Edge Function response maps do not currently know a `STAMP_CARD_FULL` status, so the new DB status needs a localized business scanner message and transport tone.
- The user confirmed current hosted data is disposable and local Docker is not a blocker. Hosted Supabase can be mutated directly, but only after the cap fix is applied so the next manual test starts clean.

## Current Review (Mobile Runtime Recovery + Expanded Demo Accounts)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix reported mobile runtime errors for duplicate custom department tags, stale refresh tokens, and missing `ExpoAudio`; expand hosted demo event assignments; enforce OmaLeima as the default business logo.

## Mobile Runtime Recovery + Expanded Demo Accounts Findings

- Student custom department tag creation first reads active tags, then inserts. If another row with the same slug already exists outside that read window, Supabase returns `23505 department_tags_slug_key` and the app throws a redbox instead of attaching the existing tag.
- `ExpoAudio` still redboxes on stale native builds because requiring `expo-audio` evaluates `AudioModule` and calls `requireNativeModule('ExpoAudio')`. A catch around `require` is not enough on React Native; the package must not be loaded until `ExpoAudio` is known to exist.
- `SessionProvider` assumes `supabase.auth.getSession()` resolves to `{ data, error }`. Stale local refresh tokens can reject with `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`, so the provider needs a catch path that clears local auth state without surfacing a crash.
- The hosted demo dataset had 3 events. The user wants more student/business/organizer test coverage, so the seed should create additional active/upcoming events and join the current scanner business to all of them.
- Business logos are optional in schema/UI, but the product now wants every business to default to the OmaLeima logo unless the business explicitly changes it.

## Current Review (Store Screenshot Demo Reset + Stale Native Audio Guard)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix the reported business scanner `ExpoAudio` runtime crash, align the mobile language icon treatment, and prepare a destructive-but-repeatable hosted Supabase demo reset/seed for App Store and Google Play screenshot capture.

## Store Screenshot Demo Reset + Stale Native Audio Guard Findings

- `safe-scan-feedback.ts` still dynamically imports `expo-audio`. In stale dev/native builds, the Expo module can throw `Cannot find native module 'ExpoAudio'` while the JS module is evaluated, before the action can recover cleanly.
- Audio feedback must remain optional at runtime. QR scan success/error UX should never block stamp creation or scanner result rendering when the installed binary lacks the latest native module graph.
- The shared mobile `LanguageDropdown` still wraps the globe icon in a lime circular background/border. Business profile preference rows use plain aligned icons, so the language row looks inconsistent.
- Hosted Supabase contains only demo/non-real data per the user. Destructive cleanup of events, stamps/leimat, announcements, rewards, and leaderboard data is approved for this screenshot-prep task.
- Screenshot data should preserve existing Auth users/profiles/business staff, assign the existing business and registered students into polished Finnish-culture demo events, and avoid creating unrecoverable account state.

## Current Review (Full Release Readiness Review)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Purpose:** Deep release gate review for web production, Android Play Store, and Apple App Store/TestFlight readiness.

## Full Release Readiness Review Surfaces

- `apps/admin`: public website, admin dashboard, organizer dashboard, API routes, account creation, support replies, user lifecycle, locale/cookie/session behavior, image uploads, deletion flows, browser smoke scripts.
- `apps/mobile`: student QR/rewards/community, business scanner/events/ROI/profile, organizer events/announcements/reports/profile/claims, native modules, consent/legal, push, camera, media/share/audio/haptics, store config and generated native resources.
- `supabase`: migrations, RLS policies, RPC atomicity, Edge Functions, storage buckets, push/support functions, scan/reward/account lifecycle invariants.
- `docs` and scripts: store-readiness audits, native smoke gates, launch runbook, physical-device test checklist, hosted/local smoke harnesses.

## Full Release Readiness Review Risks

- A route can typecheck/build while still failing click-path behavior, locale persistence, form post-state, or authenticated data visibility.
- QR/stamp/reward flows need database-level race-condition proof; UI-level button hiding is not sufficient.
- Native modules require fresh builds; source-level declarations do not prove installed binary behavior.
- Apple/Google store readiness includes legal links, privacy manifests, icon/notification assets, permissions, OAuth behavior, and real-device camera/push/share/audio checks.
- Hosted production readiness may diverge from local migration state; hosted schema checks must be read-only and explicit.

## Full Release Readiness Review Existing Evidence

- Latest `PROGRESS.md` says mobile QR feedback/icon audit validations passed, but physical device audio/haptic smoke remains open.
- Previous handoffs record local seeded admin/club browser smoke passing, but hosted authenticated smoke remains credential-blocked.
- Store readiness audit exists and has been strengthened over several slices; this review must verify that it still matches the current dependency/native config state.

## Full Release Readiness Review Findings And Fixes

- **Fixed admin password login trust boundary:** `/auth/password-session` no longer accepts browser-provided Supabase session tokens. It now validates Turnstile server-side, performs `signInWithPassword` on the server route, resolves admin access, and sets cookies only after those checks pass.
- **Fixed scanner device bypass:** `scan-qr` now rejects business scanner requests with `SCANNER_DEVICE_REQUIRED` when no scanner device id is provided, so scanner PIN/device controls cannot be bypassed by sending `null`.
- **Hardened suspended/deleted account access:** new release-gate migration tightens staff/helper functions and own-row RLS policies around `is_active_profile(auth.uid())`, and narrows public leaderboard visibility to public operational events.
- **Hardened SECURITY DEFINER read functions:** `get_event_leaderboard` now ignores spoofed `p_current_user_id`, checks event visibility, and is not granted to anonymous callers; `get_latest_valid_stamp_by_events` is service-role only.
- **Fixed admin user deletion lifecycle:** admin status updates to `DELETED` now also soft-delete the matching Supabase Auth user with `shouldSoftDelete = true`, revoking future Auth sessions while preserving relational history.
- **Fixed stale student QR after successful scan:** student active QR refetches the QR token after stamp celebration, reducing the chance that a just-used QR stays visible until expiry.
- **Closed dependency hygiene gap:** `expo-asset` was added and wired so Expo Doctor passes with the current Expo/native dependency graph.
- **Fixed iOS native release compile blockers:** the Expo config plugin now patches generated Podfile RNScreens header search paths for ReactCodegen and aligns generated Xcode `ASSETCATALOG_COMPILER_APPICON_NAME` from stale `expo` to `AppIcon`. The store readiness audit now catches the stale icon compiler setting.

## Remaining Release Gates

- **Apple App Store public submission is not a clean yes yet:** the app uses Google-only student sign-in. Apple may require Sign in with Apple for public App Store review unless the flow qualifies for an exemption or Apple provider support is added.
- **Physical-device smoke is still mandatory:** camera scanner, QR rotation, audio/haptic feedback, push delivery, Google OAuth, Photos/Gallery save, share sheet, screenshot protection, notification icons, and Android/iOS permission prompts cannot be fully proven from this terminal.
- **Hosted production is not fully proven:** new Supabase migration and `scan-qr` Edge Function changes are local until deployed; hosted authenticated admin/organizer smoke still needs real staging/production credentials.
- **Android device smoke is environment-blocked in this run:** `adb` has no connected devices. Previous Android release/audit gates pass from earlier slices, but this review did not complete a fresh physical-device scanner/OAuth/push smoke.
- **Edge Function Deno typecheck is environment-blocked:** `deno` is not installed, so `scan-qr` was validated through TypeScript consumers and Supabase migration/lint gates, not Deno compile.

## Current Review (Mobile QR Scan Feedback + Icon Completeness)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add polished success/error feedback when a QR scan results in a stamp, and complete missing mobile icon size assets/gates.

## Mobile QR Scan Feedback + Icon Completeness Findings

- Business scanner already maps `scan-qr` responses to `success`, `warning`, `danger`, and `neutral` tones in `scan-transport.ts`. `BusinessScannerScreen` displays these tones but does not play a sound or trigger result-level haptics after the Edge Function returns.
- Student active QR screen already detects new valid stamps through Supabase Realtime plus stamp-count polling and opens the reward/stamp celebration overlay. This is the correct student-side moment to play the same success feedback after a venue scans the QR.
- `expo-haptics` is already wrapped in `safe-haptics.ts`, but there is no equivalent safe audio wrapper. Adding top-level native audio imports would risk the same stale-dev-client red-screen class seen earlier with media/share modules, so audio must be dynamically loaded and best-effort.
- `expo-audio` is the current Expo SDK 55 audio package. `expo install expo-audio` added the dependency, but the dynamic Expo config requires the plugin to be added manually.
- Store icon assets currently cover iPhone and Android launcher sizes, but iPad store-size derivatives are missing from `assets/store-icons/apple`. Even though `supportsTablet` is false, keeping the complete App Store icon set helps asset handoff and audit confidence.
- The store readiness audit validates core icon paths exist but does not verify the dimensions of the store handoff icon set. Missing or wrongly sized store icons could slip through.

## Current Review (Mobile Community Club Detail Modal Scroll)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix the student Community/Yhteisö club detail popup so long club details scroll inside the modal and audit related overflow risks in that surface.

## Mobile Community Club Detail Modal Scroll Findings

- `PublicClubDirectorySection` uses a transparent `Modal` with a centered custom sheet and an inner `ScrollView`, but the sheet is only given `maxHeight` and the `ScrollView` is not flex-constrained. With long contact fields, the sheet can grow visually toward the bottom tab area instead of forcing the content to scroll inside.
- The modal sizing currently uses `windowHeight - 48` and does not account for safe-area top/bottom insets or the student tab bar region. On iPhones with a home indicator/tab bar, the sheet can sit under app chrome.
- The close button is part of the scroll content. In a long modal it can move away after scrolling, making dismissal less reliable.
- Website/email/Instagram/phone values can be very long. They currently render without `numberOfLines`/wrapping control in contact rows and can widen/heighten rows unexpectedly.
- Contact press handlers use `selectedClub.contactEmail ?? ""` and normalized URLs from nullable values. They are guarded by render conditions, but the code can be clearer with non-null local constants.
- Related mobile modal scan found other event/support modals already use `ScrollView` with bounded sheets or explicitly capped descriptions. The concrete overflow risk in this slice is the community club detail modal, plus false "no contact details" copy when website or Instagram exists but email/phone are empty.

## Current Review (Mobile App Icon + Notification Branding)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Replace default Expo branding in iOS/Android app icons and Android notification icons with OmaLeima logo assets.

## Mobile App Icon + Notification Branding Findings

- The top-level Expo app icon already points to `./assets/images/icon.png`, which is the OmaLeima stamp logo.
- iOS overrides the top-level icon with `ios.icon: "./assets/expo.icon"`. That folder contains `expo-symbol 2.svg`, so iPhone builds can still receive the default Expo icon.
- Android adaptive icon foreground/background assets are OmaLeima-branded, but `android.adaptiveIcon.monochromeImage` points to `android-icon-monochrome.png`, which is currently an Expo-style caret symbol.
- `expo-notifications` is configured with color and default channel only. Expo's notification config requires a 96x96 all-white PNG with transparency for a custom Android notification tray icon; otherwise Android may fall back to the app/default icon behavior.
- Changing app icons and notification icons is native configuration. The fix must be followed by prebuild/EAS/native rebuild before it appears on installed devices.

## Current Review (Admin Manual Organization Account Creation)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add an admin web manual organization/club account creation flow equivalent to the existing manual business owner account creation flow.

## Admin Manual Organization Account Creation Findings

- Manual business creation already has a good pattern: client form -> admin-only route handler -> service-role auth user creation -> atomic database RPC -> auth rollback on database failure.
- Admin currently has no equivalent flow for creating a club/organization owner login and club membership from a full manual form.
- The target database objects are `profiles`, `clubs`, `club_members`, and `audit_logs`. Creating these with separate client-side calls would risk partial state; the club/profile/member transition should be one RPC.
- Existing profile eligibility rules from business creation should be mirrored: do not reuse an existing email; a freshly created profile must still be a plain `STUDENT` profile and must not already belong to business staff or club membership.
- Organization profile fields already exist in the current schema: `clubs.name`, `slug`, `university_name`, `city`, `country`, `contact_email`, `phone`, `address`, `website_url`, `instagram_url`, and `announcement`.

## Current Review (Native Share Guard + Organizer Profile Polish)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix reported leima-card save/share runtime crashes, make business active event details reliably scrollable, upgrade mobile organizer reports to the business ROI visual standard, and add organizer profile phone/address editing on web plus verify mobile wiring.

## Native Share Guard + Organizer Profile Polish Findings

- `student/active-event.tsx` dynamically imports `expo-sharing`, but old installed dev clients still throw `Cannot find native module 'ExpoSharing'` before the share action can recover. Sharing should use React Native's built-in `Share` path for this screen so old clients do not red-screen.
- `react-native-view-shot` can expose capture through a named `captureRef` export or the default `ViewShot.captureRef`. The current destructuring assumes only the named export and can produce `captureRef is not a function`.
- `expo-media-library` remains required for saving to Photos/Gallery. If the installed binary predates that native module, the UI must show an explicit "install latest build" error rather than crashing the route.
- Business event detail modal already has a `ScrollView`, but the inner content has no safe bottom padding/min-height behavior for long descriptions under modal/tab overlays. The sheet needs a more conservative viewport height and scroll content padding.
- Mobile organizer reports are still much plainer than business ROI: no icon hero, no explanatory metric cards, hard-coded `fi-FI` number formatting, and compact event rows rather than polished metric pills.
- Mobile organizer profile already includes `phone` and `address` fields backed by `clubs.phone` and `clubs.address`.
- Web organizer dashboard has no `/club/profile` page or profile edit form, so organizers cannot manage club phone/address from the web panel even though the database and mobile app support those fields.

## Current Review (Hosted Club Contact + Native Share Build Gate)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Apply/verify the hosted club public contact migration, fix the reported `ExpoMediaLibrary` native-module crash path, refresh native build gates, and define the physical-device QR/share smoke checklist.

## Hosted Club Contact + Native Share Build Gate Findings

- Hosted Supabase project `jwhdlcnfhrwdxptmoret` now has `public.clubs.phone`, `address`, `website_url`, and `instagram_url` as nullable `text` columns. Runtime production reads are unblocked, but hosted migration history uses an earlier applied `club_public_contact_fields` version, so future migration reconciliation should not assume the exact local timestamp is the only remote marker.
- The reported `Cannot find native module 'ExpoMediaLibrary'` crash is caused by a JS bundle importing new native modules while the installed iOS dev client/native binary predates those modules. A fresh native dev/preview/store build is required; Metro reload alone cannot add native modules.
- `active-event.tsx` previously imported `expo-media-library`, `expo-sharing`, and `react-native-view-shot` at module top level. On older native binaries, that could red-screen the whole QR route before user-facing error handling ran.
- The QR-to-LEIMA flip briefly made the QR side still visible while protection was already disabled. Screenshot prevention must stay active until the live QR face is gone.
- QR generation and SVG query keys contained bearer/QR tokens. Even in memory-only query cache, secrets should not be part of query keys or long-lived cache identifiers.
- Store readiness audit previously verified broad privacy/native policy but did not catch missing generated `ExpoMediaLibrary`, `ExpoSharing`, `react-native-view-shot`, or `NSPhotoLibraryAddUsageDescription` output, creating a false-green risk.
- Physical share/save behavior still requires real devices. This machine currently shows no Android devices and two iPhones offline, so final Photos/Gallery/share-sheet/QR screenshot behavior must be completed by manual smoke after installing the new builds.

## Current Review (Dashboard Locale + Claims Smoke + Student Reward Detail)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Run credentialed admin/organizer smoke where the environment allows it, verify `/club/claims`, fix dashboard locale switching, and move student event reward details into an obvious top-level gift action/modal.

## Dashboard Locale + Claims Smoke + Student Reward Detail Findings

- Dashboard locale switch currently writes a non-httpOnly cookie with `document.cookie` and then calls `router.refresh()`. The app also has `/api/dashboard-locale`, which writes the same cookie as httpOnly via a redirect. In practice the client-only cookie path can fail to affect the next server render in authenticated dashboard pages, matching the reported "loading but language does not change" behavior.
- The existing `smoke:dashboard-browser` already signs in seeded admin and organizer users, clicks `/admin` and `/club` routes, and explicitly toggles locale on `/admin/users` and `/club/claims`. It is the right local click-smoke to run after the locale fix, provided local Supabase seed and the admin dev server are running.
- `/club/claims` read-model includes operational events, claimable candidates, and recent claims. The browser smoke clicks the route but does not currently create a brand-new event; a data-level sanity check against the seeded/local DB is needed to confirm event visibility rules.
- Physical-device/dev-client student/business smoke cannot be truthfully marked complete from the terminal alone. The repo can still be validated with Expo/web/type/lint and we should report the device requirement as a remaining manual gate if no device session is available.
- Student event detail currently renders reward tiers inside the venue section and again inside the venue detail modal. This makes reward information feel buried at the bottom rather than discoverable near the event join/register intent.

## Current Review (Mobile Student/Business UX Fix Pack)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix the concrete mobile UX defects reported by the user across business event details, business ROI, student QR/pass behavior, profile language controls, community club details, and shareable leima card output.

## Mobile Student/Business UX Fix Pack Findings

- Business event preview is a `Modal` with a non-scrollable `modalContent`. Long event descriptions can extend below the viewport and cannot be scrolled, matching the screenshot.
- Business ROI exists but reads like a raw metric dump: event rows mix English text (`stamps`, `unique students`, `repeat`) into Finnish sessions, raw status values are shown, and the cards do not explain what each metric means.
- Student QR event hero has an effect that calls `scrollTo({ animated: true })` whenever the selected event index changes. That makes the rail slide automatically after selecting/swiping, while the user wants the selected event to stay stable without an automatic slider-like movement.
- The shared `LanguageDropdown` has a plain row layout and lime standalone globe icon; it does not match the rounded icon-bubble treatment used by other profile preference rows.
- The public club directory relies on a small icon-only info button over the image. The user reports it is not discoverable. The detail modal also shows only limited text and no large cover/logo presentation.
- Sharing the QR itself would violate the product security model. Sharing the leima-card side is safe because it is a progress/social artifact, not an active QR token. Current dependencies do not include capture/share/media-library support, so implementing save/share requires adding project dependencies and store permission copy.

## Current Review (Student/Business Mobile + Public Web Surface Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue the student/business mobile and public-web review by fixing concrete user-facing presentation defects found in student event detail/reward surfaces, business event participation surfaces, and the public application/contact forms.

## Student/Business Mobile Surface Sweep Findings

- Student event detail handles the most common registration statuses, but several known RPC statuses (`AUTH_REQUIRED`, `ROLE_NOT_ALLOWED`, `EVENT_NOT_FOUND`, `EVENT_NOT_AVAILABLE`, `NOT_REGISTERED`, etc.) fall into a generic raw status-code message instead of a clear localized explanation.
- Student event detail map failures can expose implementation details such as venue ids and generated Apple Maps URLs to the user.
- Business event cards render `ACTIVE` joined events as `Live` even in Finnish sessions, while the rest of the app uses `Käynnissä`.
- Business join/leave transport errors render raw technical messages in the error card. Status payloads are localized, but network/RPC transport failures are not.
- Student reward progress shows `tier.rewardType.toLowerCase()`, which exposes enum values like `haalarimerkki`, `coupon`, or `entry` instead of polished FI/EN reward type labels.
- Public `/apply` uses localized page content, but the client currently trusts server `responseBody.message` for failed business application submissions. That can show raw English operational messages such as `Validation failed.`, `Invalid request origin.`, `Submission rejected.`, `Verification failed.`, or `Could not create business application.` on the Finnish page.
- Public `/apply` also forwards raw Zod field messages into field hints. These are technical English validation strings and should be replaced with existing localized field hints/error copy.
- Public `/contact` already localizes top-level validation state, but 400 responses still copy server `fieldErrors` into field hints. Attachment validation and Zod messages can therefore show raw English text on Finnish contact pages.

## Current Review (Mobile Organizer Announcement Notice Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix remaining organizer mobile announcement form notices that can display raw English transport/validation messages in Finnish sessions.

## Mobile Organizer Announcement Notice Sweep Findings

- `club-announcements` mutation functions intentionally return explicit English transport messages for create/update/archive/delete. The UI localizes success responses, but `NOOP` responses still render `result.message` directly.
- `createActionNotice` in `club/announcements.tsx` currently displays raw `Error.message`, so common validation errors like invalid CTA URL, too-short title/body, invalid priority, or invalid date order are not localized.
- The empty/loading club picker info card uses a fixed `Club` eyebrow even in Finnish sessions.

## Current Review (Mobile Organizer Copy Consistency Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue the admin/organizer review on mobile organizer event surfaces by fixing visible FI/EN copy inconsistencies and success/error notices without changing backend contracts.

## Mobile Organizer Copy Consistency Sweep Findings

- Mobile organizer home and event preview modal localize most timeline statuses, but `LIVE` still renders as `Live` in Finnish while nearby organizer screens already use `Käynnissä`.
- Mobile organizer event create/update/cancel/delete mutations return English transport messages. The events screen currently renders `mutation.data.message` directly as a success notice, so Finnish sessions can show English success copy after organizer actions.
- Non-success mutation payloads can also populate `mutation.data.message`; the current `latestMessage` calculation does not check `status === "SUCCESS"`, so an error payload can appear in the green success text area while the action notice shows an error.
- Validation errors for common organizer form cases are localized, but ticket URL and not-allowed lifecycle errors can still fall through as raw English messages.

## Current Review (Admin/Organizer Cross-Surface QA Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue the broad admin/organizer review by fixing concrete issues found in web organizer smoke coverage and mobile organizer reports localization.

## Admin/Organizer Cross-Surface QA Sweep Findings

- Web dashboard browser smoke covers admin routes and most organizer routes but does not click the newly added `/club/reports` route, leaving the organizer report page outside the credentialed navigation regression path.
- Mobile organizer `club/reports` shows localized page title/body, but event rows still render English metric nouns (`registered`, `stamped`, `venues`) in Finnish sessions.
- Mobile organizer reports render raw event status values (`DRAFT`, `PUBLISHED`, `ACTIVE`, `CANCELLED`, `COMPLETED`) instead of user-facing localized status labels.
- The broader QA gap that remains after code-level validation is credentialed physical/browser click-smoke: admin/organizer web forms and mobile organizer flows need real accounts/devices for final confidence.

## Current Review (Web Login Legal Links + Dashboard Locale Polish)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add legal/social/support links to the admin login page, stop dashboard shortcut badges from covering card copy, fix visible Finnish/English mixups in admin and organizer web panels, and deploy the pending hosted Supabase report/re-engagement changes.

## Web Login Legal Links + Dashboard Locale Polish Findings

- Admin login already has public legal pages at `/privacy`, `/terms`, `/contact` and the public site uses `https://www.instagram.com/omaleima/`, so the login page can reuse existing public routes instead of introducing new destinations.
- Dashboard shortcut cards use a three-column grid with icon/body/badge. On narrow cards and longer Finnish copy, the badge column can visually cover or squeeze the copy, as seen on the organizer fraud review card.
- Organizer event rules builder contains hardcoded English labels and help text even when the panel locale is Finnish.
- Dashboard shortcut badge suffixes are hardcoded in English (`open`, `ready`, `listed`, `live`, `official`, `clubs`, `tiers`) while card titles/descriptions are already localized, producing mixed-language cards.
- Admin and organizer sidebar item labels are defined as static English navigation arrays/functions; route content may be localized while the shell navigation remains English in Finnish sessions.
- The previous ticket URL/report/re-engagement slice was locally validated but still needs hosted Supabase migration/function deployment if credentials and remote migration state allow it.

## Current Review (Ticket URL + Organizer/Business Reports)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add a generic event ticket URL, professional organizer reporting on web/mobile, business ROI reporting, and stronger post-event re-engagement without hard-coding Kide or inventing revenue facts.

## Ticket URL + Organizer/Business Reports Findings

- `events` has no ticket URL field today; event create/update flows exist in admin web and organizer mobile, while student event detail is the right consumer surface for a generic external ticket link.
- Organizer dashboards already aggregate registrations, venues, stamps, reward tiers, and claims, but those queries are operational/recent views rather than durable report read models.
- Business mobile history is scanner-user scoped. ROI reporting should be business scoped for managers and should remain hidden from scanner-only staff unless the product explicitly expands scanner permissions.
- Existing fact tables can support honest ROI indicators: valid scans, unique scanned students, joined events, repeat visits, scanner activity, reward claims, and post-event engagement. There is no payment/revenue/cost source, so monetary ROI must not be fabricated.
- Announcements already provide localized title/body, CTA, popup/feed/push delivery, device preferences, and delivery audit. The missing piece for stronger post-event recall is event-scoped targeting, so only registered students for a specific event receive the follow-up.
- Event-scoped announcement visibility and push targeting must be enforced server-side/RLS-side, not only by UI filters, otherwise private event participation can leak.
- Report queries should avoid client-side N+1 fan-out as data grows. Scoped SECURITY DEFINER RPCs with explicit authorization checks are the cleanest source-of-truth for web and mobile.

## Current Review (Business Onboarding + Organizer Profile Exit)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Remove the business home profile shortcut, add organizer mobile profile sign-out, and introduce a first-run business onboarding slider that can be reopened from the business profile.

## Business Onboarding + Organizer Profile Exit Findings

- Business home currently has a top-right `Avaa profiili / Open profile` button beside sign-out. The user wants this removed; profile remains accessible from the business bottom tab.
- Organizer/club profile imports settings, support, legal links, and language/theme controls but does not expose the shared `SignOutButton`.
- Business profile already imports `SignOutButton`, `LegalLinksModal`, `LanguageDropdown`, and has a preferences card, making it the right place for a "show onboarding again" action.
- Existing mobile assets already include project-bound raster onboarding visuals (`omaleima-qr-checkpoint`, `omaleima-leima-pass`, `bar-friends`). Per the named `imagegen` skill guidance, using these existing workspace assets is safer than generating new temporary images unless a new visual is strictly needed.
- SecureStore is already used for mobile consent and preferences. A per-user business onboarding key can make the popup one-time without touching Supabase schema or server state.

## Current Review (Mobile/Admin Runtime Fix Slice)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix repeated mobile `onAnimatedValueUpdate` warnings, remove redundant push-ready profile copy, complete admin-created business profile fields, and make organizer event deletion visible from mobile.

## Mobile/Admin Runtime Fix Findings

- Mobile still has app-owned React Native `Animated` surfaces using the native driver. The previous navigation route fix reduced one source, but custom native-driver animations can still emit the warning; hiding it with `LogBox` would only mask the runtime signal.
- Student profile shows both a registered-push sentence and the right-side `Ready` pill. The sentence is redundant once registration is complete.
- Admin manual business creation accepts `ownerName`, but the RPC only writes it to `profiles.display_name` and `business_applications.contact_name`; mobile business profile reads `businesses.contact_person_name`, so the responsible person appears empty.
- `businesses.y_tunnus` already exists and mobile reads it, but the admin manual account form/API/RPC do not expose or populate it.
- Organizer mobile event deletion exists only for draft events in the list action sheet. The edit modal can show Edit/Cancel without an explicit Delete action, so organizers do not see how to remove a just-created draft. Published/active events still must be cancelled instead of hard-deleted to preserve registrations, stamps, claims, and audit history.

## Current Review (Android Release Smoke + Hosted Login Content Gate)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue App Store/Google Play preflight with Android release runtime smoke and hosted mobile login slide content hygiene.

## Android Release Smoke + Hosted Login Content Gate Findings

- Android SDK tools exist under `~/Library/Android/sdk`, but `adb` is not on shell `PATH`. Using the SDK-local binary unblocks emulator QA without changing global machine configuration.
- `Pixel_9` AVD boots successfully and the locally assembled release APK installs on `emulator-5554`.
- The release APK launches without crash-buffer entries. The first screen shows the one-time privacy modal, and tapping `Accept and continue` reaches the mobile login screen.
- The hosted active mobile login slide currently renders placeholder copy (`Test` / `Life is good when you mute`) in the release app. This is not a code crash, but it is a real public-launch/store-review content risk because screenshots/reviewers see hosted data.
- `audit:store-release-readiness` currently validates static repo legal/build/native gates but does not query hosted active mobile login slide content. It can pass while production login hero content is still placeholder.

## Current Review (iOS Native Release Sync Gate)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue the App Store/Google Play preflight by proving the generated iOS native project stays aligned with Expo source-of-truth privacy declarations and can compile in Release for simulator.

## iOS Native Release Sync Gate Findings

- XcodeBuildMCP discovers `/apps/mobile/ios/OmaLeima.xcworkspace`, the `OmaLeima` scheme, and enabled iOS simulators, so a local iOS compile gate is now feasible.
- `apps/mobile/app.config.ts` now declares app-level `ios.privacyManifests`, but the current generated `apps/mobile/ios/OmaLeima/PrivacyInfo.xcprivacy` still has an empty `NSPrivacyCollectedDataTypes` array. A local Xcode archive/build from this stale generated project would not reflect the App Store privacy disclosure source-of-truth until prebuild runs.
- `apps/mobile/ios` is ignored, so the tracked fix must be a regression gate plus docs, not relying on committed generated iOS files.
- The existing `audit:store-release-readiness` only checks Expo config for iOS privacy coverage. It should also check the generated native privacy manifest when the generated iOS project exists locally.
- The generated iOS Pods lockfile can keep stale nested module paths after Expo package changes. This caused the first Release simulator build to fail on an old nested `expo-auth-session/node_modules/expo-crypto` path until `pod install` regenerated the Pods graph, so the audit should catch that stale path when local generated Pods exist.
- Expo Dev Client local-network Info.plist keys can remain in the final Release simulator app because Expo's generated stripping phase runs before `ProcessInfoPlistFile` in this workspace. Store/profile builds need an explicit source-of-truth config plugin that removes `NSBonjourServices` and `NSLocalNetworkUsageDescription` while preserving development builds.
- iOS Always/background location permissions are not part of the current scanner product requirement. The app should request only When In Use location for event-day fraud review, and the store-readiness audit should fail if Always/background location keys reappear.
- App Store Connect privacy labels and Sign in with Apple remain store-console/provider decisions outside this repo-owned native sync gate.

## Current Review (Store Permission Hygiene Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue the pre-store release review with Codex Security, Expo, iOS, Android, and ECC guidance; patch repo-owned native policy issues that can be fixed without store-console credentials or physical devices.

## Store Permission Hygiene Sweep Findings

- Android `app/src/main/AndroidManifest.xml` currently includes `android.permission.SYSTEM_ALERT_WINDOW`. The app does not need overlay windows for student QR, scanner, organizer, support, or push flows, and Google Play treats this permission as sensitive/high-friction unless it is core functionality.
- Expo config does not block `SYSTEM_ALERT_WINDOW`, so prebuild/native regeneration can reintroduce the permission even if the checked-in manifest is edited manually.
- Android `allowBackup` is currently `true`. The app stores session/role/scanner identifiers in device storage; Play submission is cleaner and safer when Android cloud/device backup is disabled for this app surface.
- The existing `audit:store-release-readiness` gate checks identity, assets, legal links, and EAS setup, but it does not yet enforce Android sensitive-permission hygiene or backup posture.
- Expo public config can still surface `android.permission.RECORD_AUDIO` through image/camera package defaults even though the checked-in native manifest removes it. OmaLeima does not use microphone capture, so microphone permission should also be blocked at Expo config source-of-truth level.
- iOS Info.plist includes Expo Dev Launcher local-network keys in the checked-in development native project, but Expo Dev Launcher has a release build phase that strips its own `_expo._tcp` Bonjour service and default local-network description from non-Debug builds. That remains a release-build verification item, not a source-code patch target for this slice.
- Expo Doctor passes 17/18 checks, but fails dependency validation because 19 Expo SDK 55 packages are behind the patch versions expected by the installed SDK. These should be aligned with Expo's resolver before store builds.
- Physical Android/iOS camera, OAuth, and push proof still require a running emulator/device or store credentials. This slice must report those as environment blockers rather than marking them complete.

## Current Review (iOS Privacy Manifest Source-Of-Truth)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue store readiness by moving iOS app-level collected-data disclosure into Expo config and making the repo audit catch regressions.

## iOS Privacy Manifest Source-Of-Truth Findings

- Apple's official privacy manifest documentation says apps should record collected data types in the bundled privacy manifest. The current generated `ios/OmaLeima/PrivacyInfo.xcprivacy` has `NSPrivacyCollectedDataTypes` as an empty array.
- OmaLeima collects app-functional account/contact data, support content, scanner location proof, uploaded business/club images, push-device identifiers, and event/leima/reward interaction records. The empty collected-data array is therefore not a good App Store readiness posture.
- The generated `ios/` folder is ignored in this repo, so directly editing `ios/OmaLeima/PrivacyInfo.xcprivacy` would not be a reliable source-of-truth for EAS builds.
- Expo SDK 55 supports `ios.privacyManifests` in `app.config.ts`; that is the correct source-of-truth for prebuild/EAS generation.
- The existing `audit:store-release-readiness` gate checks privacy policy text and in-app links, but it does not yet verify the native iOS privacy manifest collected-data coverage.

## Current Review (Mobile Login Slider Target Fix)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Move admin-managed login slider rendering from the web admin login page to the mobile login hero, and restore the web admin login visual to its static fallback.

## Mobile Login Slider Target Fix Findings

- `/admin/login-slides` correctly manages `public.login_slides` records and `login-slider-media` images, but `/login` in the admin web app calls `fetchActiveLoginSlidesAsync`, so the managed slider currently appears on the web admin login page.
- The mobile login hero still renders only `copy.auth.onboardingSlides` with local fallback cover images, so admin-created mobile login slides never appear in the app.
- `login_slides` RLS already allows public reads for active slides, so mobile can safely query active records with the publishable Supabase client without adding a new API route.
- The web admin login can restore the previous default visual by passing `loginSlideFallbackRecords` directly instead of querying active DB records.
- Mobile should keep local onboarding slides visible when no active DB slides exist, but a query failure must be explicit in UI rather than silently hiding the problem.

## Current Review (Dashboard Browser Smoke Coverage)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add a credentialed local browser smoke for admin/organizer dashboard navigation and locale switching, using the existing seeded accounts and Playwright smoke helpers.

## Dashboard Browser Smoke Coverage Findings

- Existing route smokes prove protected routes return expected HTTP statuses, but they do not click sidebar links, sign-out, or the new client-side dashboard locale switch in a real browser.
- The existing browser smoke helper still waits for the old login hero heading text. Admin-managed login slides intentionally change this copy, so the stable assertion should target the password panel heading instead.
- Dashboard browser smokes expect English route titles, while dashboard locale defaults to Finnish when the locale cookie is absent. The helper should set the non-sensitive dashboard locale cookie to English before password sign-in so existing browser smokes are deterministic.
- ECC `browser-qa` and `e2e-testing` guidance both point to a small, repeatable credentialed click-path smoke rather than another static/code-only audit.

## Current Review (Supabase Lint + Local QA Hygiene)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Remove the remaining local Supabase lint warning and align local QA guidance with the CLI/version path that successfully applies the current migration chain.

## Supabase Lint + Local QA Hygiene Findings

- `npx --yes supabase@2.98.2 db lint --local` reports one warning: `public.create_business_owner_access_atomic` declares `v_owner_profile` and only uses it as a `SELECT INTO` existence lock target.
- The legacy owner-access route and Edge Function are already fail-closed/deprecated, but the RPC still exists in the schema for compatibility. The safest cleanup is a behavior-preserving corrective migration that replaces the unused row variable with `PERFORM ... FOR UPDATE`.
- Older Supabase CLI `2.90.0` cannot reliably parse parts of the current migration chain. The working local path is Supabase CLI `2.98.2` with `migration up --local`, Auth container restart when needed, and direct `seed.sql` replay.
- `docs/TESTING.md` still presents `supabase db reset --yes` as the only baseline path. In this workstation, that path can hang during service bootstrap, so the docs should include the pinned incremental setup as the recommended local smoke path while leaving clean reset as a stronger isolated option.

## Current Review (Local Migration Parser Unblock)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Unblock local Supabase migration application so admin route smoke can run against the current schema.

## Local Migration Parser Unblock Findings

- Local Supabase DB is behind the current migration files: direct DB inspection shows no `public.login_slides`, no `login-slider-media` bucket, and no migration records after `20260506001000`.
- `supabase migration up --local` stops at `20260506072253_business_scanner_qr_provisioning.sql` with `cannot insert multiple commands into a prepared statement`.
- The failing statement starts at `provision_business_scanner_device_atomic` and includes the following `grant` plus the next function definition, which indicates the CLI did not split the custom dollar-quoted function body correctly.
- Converting custom function quote tags to plain `$$` was not enough. This Supabase CLI version still grouped the `CREATE FUNCTION` with the following `GRANT` and next function definition.
- The safest reproducible fix is to leave each parser-fragile `CREATE FUNCTION` as the final command of its migration file and move the related grants/next function into immediately following timestamped migrations.
- The same parser pattern appears in `20260506082728_create_business_owner_access_atomic.sql`, where the function and following grant are grouped into one prepared statement. It needs the same split without changing the owner-access function logic.
- Running migrations with Supabase CLI 2.98.2 fixes the prepared-statement parser issue, but `20260506142000_restrict_anon_security_definer_mutations.sql` assumes optional helper `public.rls_auto_enable()` exists. Fresh local DBs do not define that function, so its revoke/grant must be guarded by `to_regprocedure`.
- `supabase/seed.sql` assumes a newer Auth schema with `email_confirmed_at`, `email_change_token_new`, phone-change columns, and `auth.identities`. The current local self-hosted Auth schema uses `confirmed_at` / `email_change_token` and has no `auth.identities`, so seed users are not created after a fresh local rebuild.

## Current Review (Smoke Auth Env Bootstrap)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Make local admin auth smoke load app-local environment before importing modules that validate `NEXT_PUBLIC_SUPABASE_*`.

## Smoke Auth Env Bootstrap Findings

- `smoke:auth` imports `resolveAdminAccessByUserIdAsync` before calling `process.loadEnvFile?.(".env.local")`.
- The imported access module reaches `src/lib/env.ts`, which immediately parses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- When the script is run from repo root with `npm --prefix apps/admin run smoke:auth`, the env parse happens before the script loads `apps/admin/.env.local`, causing a Zod error instead of the intended auth smoke.
- Static imports execute before top-level code, so moving `process.loadEnvFile` above the static import in the same file is not sufficient. The access import must be delayed until after env loading.

## Current Review (PostCSS Advisory Hardening)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Address dependency audit findings that can be fixed without risky framework downgrades or broad package churn.

## PostCSS Advisory Hardening Findings

- `npm --prefix apps/admin audit --audit-level=high` exits successfully for high severity, but reports a moderate PostCSS advisory through `next -> postcss <8.5.10`.
- `npm --prefix apps/mobile audit --audit-level=high` also exits successfully for high severity, but reports the same moderate PostCSS advisory through Expo Metro tooling.
- `npm audit fix --force` suggests breaking framework changes (`next@9.3.3` or `expo@49.0.23`), which is not acceptable for a production Next 16 / Expo 55 app.
- The safer fix is to use npm `overrides` in each workspace package to force the transitive `postcss` package to a patched compatible version, then regenerate the relevant package locks and re-run audit/type/lint gates.

## Current Review (Route Smoke Harness Guard)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Make the local admin route smoke fail clearly when prerequisites are missing instead of reporting misleading app route failures.

## Route Smoke Harness Guard Findings

- `smoke:routes` signs in local seeded accounts (`admin@omaleima.test`, `organizer@omaleima.test`, `student@omaleima.test`) and is documented as a local Supabase + local Next.js smoke.
- When the local Next.js app is not running on `ADMIN_APP_BASE_URL`, the script proceeds into authenticated route assertions and fails with `Expected ... /admin to return 200, got 404`. That reads like an application route regression even though the real issue is missing/wrong local app target.
- The script also does not guard against accidentally pointing this local seeded-account smoke at a hosted app or hosted Supabase URL. Hosted smoke already has a separate script with explicit `STAGING_ADMIN_EMAIL` credentials.
- The smallest safe improvement is a preflight that verifies `/login` returns `200`, plus local-host guards for both `ADMIN_APP_BASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`.

## Current Review (Release Gate Security Hardening)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue the next practical release gate by running repo-owned mobile/web/security checks and patching confirmed high-risk gaps without broad refactors.

## Release Gate Security Hardening Findings

- Mobile repo-owned release/readiness audits are green for store legal links, realtime wiring, hosted business scanner wiring, native push device wiring, reward notification bridge, and native simulator wiring.
- Admin hosted smoke that requires private credentials is environment-blocked (`STAGING_ADMIN_EMAIL` is missing). Admin route smoke also cannot prove authenticated pages without a running seeded target, so code-level review remains the reliable path for this slice.
- The old web `create-owner-access` API now returns `410 OWNER_ACCESS_FLOW_DEPRECATED`, but `review-transport.ts` still contains a helper that can invoke the legacy `admin-create-business-owner-access` Edge Function.
- The legacy Edge Function still creates or reuses an owner account and can generate a Supabase recovery link. That conflicts with the chosen manual account creation flow and should be made fail-closed if it is still deployed anywhere.
- Login slide image URLs are admin-managed and rendered inside CSS background images. Announcement validation already restricts URLs to `http`/`https`, but login slide validation currently accepts any Zod-valid URL scheme.

## Current Review (Dashboard Navigation Latency)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Find and reduce the 2-3 second perceived delay when switching admin/organizer dashboard pages or changing dashboard language.

## Dashboard Navigation Latency Findings

- `/admin` and `/club` layouts already call `resolveAdminAccessAsync` to protect the route, and most child pages call the same access resolver again to populate `DashboardShell`. This duplicates Supabase Auth/profile/membership work in the same navigation request.
- Organizer pages usually call `fetchClubEventContextAsync`, which calls `resolveAdminAccessAsync` again even though the route layout already verified the same session.
- Dashboard language switching currently goes through a server `GET /api/dashboard-locale` route, writes a cookie, redirects back to the current page, and then performs the normal page render. That adds an avoidable network request and redirect before the actual localized render starts.
- The dashboard locale cookie is not sensitive data. It can be updated from a small client control and followed by `router.refresh()`, preserving the server-rendered localized dashboard while avoiding the redirect hop.

## Current Review (Organizer Mobile Actions + Localized Login Slides)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix organizer mobile event delete visibility, align small mobile controls, and make admin-login slider content truly admin-managed and locale-aware.

## Organizer Mobile Actions + Localized Login Slides Findings

- Organizer mobile event action-sheet delete is gated only by `event.status === "DRAFT"`, while the screen's visible operational state is also represented by `timelineState`. Draft-like events can therefore show edit while hiding the safe draft delete action.
- The circular `+` buttons in organizer events and announcements use a text glyph with a short line-height, so the font baseline makes the plus appear visually off-center inside the circle.
- The reusable mobile language dropdown renders its own bordered card inside profile preference cards. This creates a nested-border misalignment compared with the neighboring preference rows.
- Admin login slides are stored as a single copy set (`eyebrow`, `title`, `body`, `image_alt`). The login page cannot choose Finnish vs English text, and the admin form cannot enter translations.
- Existing login-slide rows and fallback copy must remain readable while the new localized columns roll out, so the read-model needs backward-compatible mapping from legacy columns to localized fields.

## Current Review (Release Smoke + Cookie Consent Persistence)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Run the repo-owned release checks that do not require real app-store consoles, physical devices, or private credentials, and fix the public website cookie consent accept-all persistence issue.

## Release Smoke + Cookie Consent Persistence Findings

- Production browser smoke confirms the `Hyväksy kaikki` button click hides the cookie banner for the current render, but reloading `https://omaleima.fi/` shows the banner again.
- The cookie banner initializes visibility from `readInitialCookieConsent()`, which returns `null` during server render because `document` is unavailable. The component does not re-read `document.cookie` after client mount, so the hydrated state can keep showing the banner even after a valid cookie was written.
- The fix should not move consent logic to a server component because the footer settings event and cookie preference UI are client-only. A mount-time client cookie read is the smallest reliable correction.
- Credentialed admin/organizer web actions and real iOS/Android camera, push, OAuth, and store-console checks remain outside what can be fully completed without credentials/devices, but static/build/audit and unauthenticated browser smoke can be completed here.

## Current Review (Mobile Privacy Modal + Language Dropdown + Organizer Edit Route)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Move mobile privacy/terms acknowledgement out of bottom inline cards into modal-style access, convert mobile language switching to dropdown controls, and make organizer upcoming-event edit navigation open the event edit form reliably.

## Mobile Privacy Modal + Language Dropdown + Organizer Edit Route Findings

- Login currently renders the legal acknowledgement as an inline `InfoCard`, and login/profile surfaces render legal links at the bottom. This satisfies visibility, but it creates persistent bottom legal UI instead of the requested one-time/needed popup behavior.
- The mobile login screen uses two language chips. Role profile screens also open language selection through the preferences modal. The requested UX is a direct dropdown, so language switching should be centralized in a reusable mobile preference control.
- Organizer upcoming preview routes to `/club/events` with an `eventId`, and the events screen tries to open edit mode from route params. The route-param handling is too narrow and only accepts a plain string, so tab reuse/array params can leave the form closed even though navigation succeeded.
- The event preview shows edit whenever `canManageEvent` is true. Completed or cancelled events should remain read-only on the preview surface to avoid routing into a non-editable state.

## Current Review (Organizer Delete + Media Cleanup + Login Slides)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add organizer-mobile delete actions for events and announcements, ensure replaced uploaded images remove their previous owned bucket object, and let platform admins manage the admin-login visual slider content without a deploy.

## Organizer Delete + Media Cleanup + Login Slides Findings

- Organizer mobile announcements currently expose edit/archive only. The web side already supports hard announcement deletion with owned `announcement-media` cleanup, so the mobile organizer surface is missing the same destructive action.
- Organizer mobile events expose edit/cancel only. Event rows can have registrations, stamps, claims, and fraud/audit history, so physical deletion must be limited to safe draft/no-history cases; operational published/live events should keep cancel semantics instead of breaking historical references.
- Mobile image upload helpers upload new event, announcement, club, and business images but do not remove the previous owned object after a successful replacement save. This can leave orphaned files in Supabase Storage.
- Admin-side announcement and event update flows also replace public image URLs without deleting the previous owned storage object. Delete flows remove some images, but replacement cleanup is not consistently centralized.
- The admin login page visual panel is static copy/image styling in code. There is no database-backed slider model, admin CRUD page, or upload bucket dedicated to login slider media.

## Current Review (Mobile Haptics Crash Fix)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Finding:** Organizer event creation used direct `Haptics.impactAsync` and `Haptics.notificationAsync`; the current iOS build reports these native methods as unavailable, so the promise rejection surfaced as a redbox after event creation.
- **Scope checked:** Direct `expo-haptics` usage across `apps/mobile/src`. The only remaining direct native import is now `features/foundation/safe-haptics.ts`, which catches unavailable native module failures.
- **Validation:** `npm --prefix apps/mobile run typecheck`, `npm --prefix apps/mobile run lint`, `npm --prefix apps/mobile run export:web`, and `rg "expo-haptics|Haptics\\." apps/mobile/src` passed with only the safe wrapper matching.

## Current Review (Full Surface QA Sweep)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Full control/logic audit for admin web, organizer web, student mobile, organizer mobile, and business/scanner mobile.

## Full Surface QA Sweep Findings To Verify

- Web has many route-level smoke scripts, but most authenticated production controls still need either credentialed browser smoke or code-level verification because unauth route guards only prove access protection.
- Mobile audit scripts are mostly wiring/static checks. They are useful release gates, but they do not prove physical camera scan, real push delivery, OAuth, or device-specific navigation behavior.
- The current worktree contains many prior slice changes. This sweep must avoid reverting unrelated changes and should use scoped diff checks for touched files.
- Five subagents are running read-only surface audits so implementation decisions should wait for concrete findings, unless local validation exposes a failure first.

## Full Surface QA Sweep Outcome

Completed. Five read-only subagents audited admin web, organizer web, student mobile, organizer mobile, and business/scanner mobile. Critical confirmed findings were fixed and validated: unsafe announcement CTA schemes, selected-event claim queue slicing, deleted reward-tier restore, student QR retry and focus-scoped capture protection, push registration `apikey`, unreachable event map action, organizer mobile non-success mutation handling, staff read-only event previews, announcement success reset, revoked claim suppression, scanner route-param selection loop, scanner location proof, PIN camera gating, and inactive business scan gating. Web production, `scan-qr`, and the hosted reward-tier restore trigger were deployed. Remaining larger follow-up work is tracked as scale/localization/device-smoke debt rather than a blocker for this sweep.

## Current Review (Claims/Fraud/Announcement/Reward Delete Lifecycle)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Verify organizer reward claim surfaces, explain fraud review behavior, fix announcement push feedback, and add real delete actions for announcements and reward tiers.

## Claims/Fraud/Announcement/Reward Delete Lifecycle Findings

- Club reward claims selection currently changes `selectedEventId`, but the selected event card is not visually distinct and the selected button still looks clickable. Clicking the already selected event therefore appears to do nothing even though the right-side queue/history is already scoped to that event.
- Recent claims and event queue are both filtered by `effectiveSelectedEventId`, so the data model is correct; the UX needs clearer selected-state behavior and selected-event copy.
- Fraud review is real but narrow: the current automatic fraud signal generator only creates `SCANNER_DISTANCE_ANOMALY` after a successful stamp insert when scanner latitude/longitude is more than 300m away from the business coordinates. Review actions call `review_fraud_signal_atomic`, which locks the signal, checks platform admin or event manager access, writes `REVIEWED`, `CONFIRMED`, or `DISMISSED`, and records audit metadata.
- Announcement push preference filtering can produce "All announcement recipients have disabled this push source." This is technically possible when every resolved active recipient has an explicit disabled preference, but the UI message does not tell the operator what to do next or distinguish disabled preferences from missing device tokens.
- Announcements support archive only. The table and related impressions/acknowledgements are safe to hard-delete because dependent announcement tables use `on delete cascade`; the owned bucket image should be deleted first or the route should fail before removing the DB row.
- Reward tiers cannot be hard-deleted once claim history exists because `reward_claims.reward_tier_id` references `reward_tiers(id)` without cascade. A real product delete action should be a dedicated `DELETED` status that hides the tier from catalogs and claim calculations while preserving reward claim history.

## Claims/Fraud/Announcement/Reward Delete Lifecycle Outcome

Made the selected reward-claims event visually and behaviorally obvious, with the selected card highlighted and the already-selected button disabled. Added fraud-review explanatory copy for admin and organizer views so operators know the current detector is scanner-distance anomaly review, not broader ML/fingerprint detection. Improved announcement push failure copy for disabled preferences and no-token states. Added an announcement delete route/client/UI action that verifies access, removes an owned `announcement-media` object when present, then deletes the announcement. Added a reward-tier `DELETED` status plus trusted RPC/route/UI action, and exposed the reward management page under `/admin/rewards`, so delete is explicit for admin and organizer users while claim history remains intact.

## Current Review (Admin List Scale + Support Reply Push)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add admin-side internal pagination/search, make support replies notify mobile users, and choose the safest admin account deletion behavior.

## Admin List Scale + Support Reply Push Findings

- `/admin/users` renders the full user snapshot and has no search/status/role controls. The read-model also has a hidden `.limit(500)`, so large datasets can silently disappear from admin management.
- Mobile support and contact submission panels already have filtering/search, but both render every filtered record in the left column. With many rows the page grows too long and detail review becomes hard to use.
- Admin support replies are saved to `support_requests.admin_reply` and mobile support history can show them, but no push notification is sent to the sender's registered devices.
- Hard-deleting a Supabase Auth/profile user would cascade through profile-owned operational rows such as device tokens, support requests, department tags, registrations, stamps, or reward-related history depending on table relationships. That is too risky for leima auditability and fraud/accounting retention.
- `profiles.status = 'DELETED'` already exists as a blocked status. The safest admin-side delete action is therefore a soft delete/anonymization that revokes access and removes personal profile fields while preserving operational event/leima history.

## Admin List Scale + Support Reply Push Outcome

Add reusable internal pagination controls, use them in users/support/contact panels, and add search plus role/status filters to `/admin/users`. Remove the hidden 500-profile cap by paging the read-model. Extend the trusted admin status RPC so `DELETED` performs an atomic soft delete/anonymization, disables memberships/device tokens, removes profile department tags, and writes audit metadata without storing deleted personal email. Add a support-reply push Edge Function and invoke it after admin replies so enabled mobile devices receive an Expo push even when the app is closed.

## Current Review (Admin Operations Reliability + User Management)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix reported admin/public-form bugs, stabilize dashboard locale persistence, and add admin-owned account creation/status management.

## Admin Operations Reliability + User Management Findings

- Public `apply` form captures `event.currentTarget` only after the async request when resetting the form. The API can insert the application successfully, then the client-side reset can throw and show the generic error even though the application row exists.
- Department tag merge can fail with `PROFILE_DEPARTMENT_TAG_TAG_MERGED` because the merge sync trigger updates source-tag profile links after the source tag has already been marked `MERGED`. The validation trigger then sees the old source tag as merged and aborts the merge.
- Dashboard locale switching uses a side-effecting `GET /api/dashboard-locale` behind a Next `<Link>`. Next prefetch can call the route without an intentional click, which explains language flipping between Finnish and English while navigating.
- `/club/department-tags` does not pass the resolved dashboard locale to its shell/panel and the panel has hardcoded English copy, so the organizer surface is especially inconsistent.
- The current owner access flow creates/reuses a user and returns a Supabase recovery link. That link is not a good admin-facing account handoff because the admin cannot choose the password or confirm the full business/account payload.
- `profiles.status` already gates admin/mobile access, but mobile does not currently subscribe to profile status changes. A suspended active session therefore needs a realtime profile subscription to sign out immediately.
- `protect_profile_sensitive_fields` correctly blocks normal clients from changing `profiles.status`; admin status changes must use a trusted service-role route after verifying the platform admin session.

## Admin Operations Reliability + User Management Outcome

Fix the false apply-form error by retaining the form element before async work. Replace the department tag sync trigger with a merge-safe order that removes duplicate source links before promoting the target tag. Disable prefetch on the locale switch and pass locale through the missing organizer page/panel. Add a manual business account form that lets platform admins create the business profile, owner auth user, owner profile role/status, and membership with an explicit password. Add an admin users page with role/status/business/club membership visibility and active/suspended actions backed by a service-role route. Add a mobile realtime profile-status watcher that signs out immediately when the current profile is no longer `ACTIVE`.

## Current Review (Store Legal Links + Transient Form Success)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Close the next repo-owned App Store / Google Play compliance gaps and make public form success feedback return to the form automatically.

## Store Legal Links + Transient Form Success Findings

- Apple App Review Guideline 5.1.1 requires an easily accessible in-app privacy policy link. The public website already has `/privacy` and `/terms`, but the mobile app does not expose those legal links directly on the login/profile surfaces.
- Apple account deletion guidance requires apps with account creation to let users initiate account deletion in-app. The support sheet already includes an account/data deletion request template, but the store readiness audit does not verify that privacy/terms links are visible in-app.
- Google Play account deletion requirements require both an in-app deletion path and a functional web resource for account/data deletion requests. The privacy notice has deletion wording, but the store audit should also verify a prominent web deletion request path.
- Public `contact` and `apply` forms currently replace the entire form with a success panel after submission. That prevents immediately sending another message/application and does not match the requested transient success behavior.
- Several admin/club action panels use persistent inline success messages. The most visible action notices can share a small three-second success-only auto-clear hook without changing error persistence.

## Store Legal Links + Transient Form Success Outcome

Add a reusable mobile legal-links card that opens the existing privacy and terms URLs from login and signed-in profile surfaces. Keep account deletion initiation in the existing support flow, and make the store-readiness audit verify both in-app legal links and the web deletion-request resource. Change public contact/apply form success from a replacement screen to inline feedback that clears after three seconds while the reset form stays visible. Add a shared transient success hook for high-visibility admin/mobile action notices; keep error states persistent.

## Current Review (Admin Login Crash Recovery)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix the production admin panel crash after password login and recover browsers stuck behind stale Supabase auth cookies.

## Admin Login Crash Recovery Findings

- Vercel production logs for the screenshot digest `3902826288` show `/admin` crashing while loading reviewed business applications.
- The failing query embeds `profiles(email)` from `business_staff`, but `business_staff` has multiple foreign keys to `profiles` (`user_id` and `invited_by`), so PostgREST cannot infer which relationship to use.
- The login lockout is caused by Supabase returning `Invalid Refresh Token: Refresh Token Not Found` in the Next proxy. The proxy currently throws for that stale-cookie state instead of clearing the invalid session cookies.
- A stale browser session should be treated as an expired local session, not as a server crash. Real unexpected Supabase errors should still throw with context.
- Student auth should stay Google-only for now. Sign in with Apple is not mandatory for development or private testing, but it remains a likely public iOS App Store review blocker when Google is offered as the only third-party account login.

## Admin Login Crash Recovery Outcome

Use an explicit `business_staff.user_id -> profiles.id` relationship in the admin business application read-model, and make the Supabase proxy expire stale auth cookies before redirecting to `/login?session=expired`. Do not add Apple login in this slice; keep it as a documented launch risk until the user explicitly chooses to implement it.

## Current Review (Store Compliance + Leima Limit Semantics)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Clarify same-venue multi-leima behavior and close the smallest repo-owned App Store / Google Play readiness gaps.

## Store Compliance + Leima Limit Findings

- Current scan backend already treats `stampPolicy.perBusinessLimit` as a total same-business/same-venue allowance, not a per-scan multiplier. One successful QR scan creates one `stamps` row, and the next valid leima requires a fresh, unused QR token.
- This product rule is safer than bulk-granting several leimat from one QR because each leima remains separately auditable by timestamp, scanner account/device, event venue, and fraud location metadata.
- Organizer/student/scanner copy says "same venue limit" but does not consistently explain that staff must scan once per leima until the configured limit is reached.
- The mobile store readiness audit is green for Expo/EAS repo wiring, but it does not prove policy readiness. The current mobile app uses Google login for primary student accounts; Apple App Review Guideline 4.8 means iOS public submission needs Sign in with Apple or an equivalent privacy-preserving login option unless a narrow exception applies.
- The mobile app has account-based features and in-app account creation/sign-in. Google Play account deletion policy and Apple privacy policy requirements make an in-app or linked account deletion initiation path necessary.
- The public privacy notice currently focuses on website/pilot enquiries and does not fully describe mobile app account data, QR/stamp/reward data, device tokens, camera/photo/location permissions, or account deletion request handling.

## Store Compliance + Leima Limit Review Outcome

Keep the scan invariant unchanged: one accepted scan records one leima; configured limits require repeated fresh QR scans. Add visible copy to organizer/student/scanner surfaces so the behavior is not ambiguous. Add a discoverable in-app support template for account/data deletion requests and expand public legal copy/docs/audit checks so store readiness no longer hides the account-deletion/privacy-policy requirements. Track Sign in with Apple as a separate required iOS public-launch auth slice, not as a rushed patch inside this copy/compliance slice.

## Current Review (Mobile Runtime Warning Cleanup)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Remove frequent mobile runtime warnings for WebCrypto PKCE downgrade and native animated value updates.

## Mobile Runtime Warning Findings

- The mobile Supabase client is configured with `flowType: "pkce"`, but React Native does not expose a browser-compatible `crypto.subtle.digest` by default.
- Supabase Auth warns that WebCrypto is not supported and falls back from SHA-256 PKCE challenge generation to `plain`. That is noisy and weaker than the intended auth flow.
- `expo-crypto` is already compatible with Expo SDK 55 and exposes native digest/random helpers, but the app does not install it as a direct mobile dependency or bridge it to `globalThis.crypto`.
- The `onAnimatedValueUpdate` warning is emitted by React Native native animated updates when navigation/tab animated values update without a registered JS listener. The app has multiple Expo Router `Tabs`/`Stack` layouts without explicit `initialRouteName`, which is a known trigger pattern for React Navigation animated navigation state warnings.

## Mobile Runtime Warning Review Outcome

Add a small native-only crypto bridge before Supabase client creation so PKCE can use SHA-256 through Expo Crypto instead of falling back to `plain`. Also make root, student, business, club, and nested event navigators declare explicit initial routes to avoid native animated value updates for ambiguous first navigation state. Do not suppress warnings globally.

## Current Review (Announcement Partial Push Retry)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Fix announcement push retry semantics when previous delivery was `FAILED` or `PARTIAL`.

## Announcement Partial Push Findings

- `send-announcement-push` currently checks all `SENT`/`READ` announcement notifications and blocks the entire request if any successful row exists for the announcement.
- The admin/club panel already advertises that `PARTIAL` push delivery can be retried, but the Edge Function returns `ANNOUNCEMENT_ALREADY_SENT` before failed recipients can be retried.
- Notifications are stored one row per user delivery attempt, not one row per device token. A successful retry for a previously failed user creates a new `SENT` row while the older `FAILED` row remains.
- The admin read-model currently treats any mix of success and failure rows for an announcement as `PARTIAL`, so old failed rows keep the UI partial even after the same user later succeeds.
- Legacy or manually inserted announcement notification rows may have `user_id = null` because the schema allows it. Those rows cannot be retried user-by-user and must not be ignored as `NOT_SENT`.

## Announcement Partial Push Review Outcome

Make retry user-scoped: initial send still targets the full resolved audience, but subsequent sends target only users with previous `FAILED` rows and no later `SENT`/`READ` row for the same announcement. Update the admin delivery-status rollup so success wins over older failures for the same user, while failures for users that never succeeded still keep the announcement `PARTIAL` or `FAILED`. Treat null-user legacy rows as visible delivery attempts in the read-model and block safe retry in the Edge Function rather than risking a duplicate full-audience resend.

## Current Review (Auth Role Entry Cleanup)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Continue with the next logical auth/role UX slice and remove the admin-panel Google login affordance.

## Auth Role Entry Findings

- Admin login renders both Google OAuth and password login, but the admin/club web panel is not a student entry point. Showing Google there invites students into a route where access guards will reject them.
- Mobile `session-access` currently resolves a single area with fixed priority: business, then club, then student. A user with multiple active roles can only use the highest-priority mobile area and gets redirected away from the others.
- Layout guards already trust `useSessionAccessQuery`, so the smallest safe fix is to make that query role-preference aware instead of adding bypasses to every layout.
- Scanner-only business sessions must stay pinned to scanner/business mode; they should not show or honor a role switcher.

## Auth Role Entry Review Outcome

Remove Google OAuth from the web admin login panel and keep password + Turnstile. On mobile, add a persisted role-area preference, expose available areas from `session-access`, and add a compact switch card to the role home screens so multi-role users can deliberately move between student, business, and club areas.

## Current Review (Mobile Reward Claim Flow)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Close the next high-impact mobile gap by adding organizer-side reward handoff confirmation and clearer student handoff guidance.

## Mobile Reward Claim Findings

- The backend already has a safe reward handoff path: `supabase/functions/claim-reward` calls `claim_reward_atomic`, and the latest migration binds non-service callers to the authenticated actor.
- Web organizer/admin already uses the same atomic RPC through `/api/club/reward-claims/confirm`, but mobile organizer surfaces only aggregate claimed/reward counts and cannot confirm a ready student reward.
- Student mobile rewards derive `CLAIMABLE` tiers correctly, but the UI stops at "ready for staff handoff" and does not give the student a clear "show this to staff" ticket tied to the masked student label used by organizer claim queues.
- The existing database model records confirmed handoff only. There is no pending claim request table, so adding a fake request queue would be broader product/schema work and should not be part of this slice.

## Mobile Reward Claim Review Outcome

Reuse the existing claim model: add a mobile club claims screen that computes claimable candidates from registrations, reward tiers, valid stamps, and existing claims, then confirms via the existing `claim-reward` Edge Function. On the student rewards card, surface a simple handoff ticket for claimable tiers using the same masked student id convention. Do not add a new pending/request state.

## Current Review (Critical Pre-Release Fixes)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Apply the first minimal fixes from the deep web/mobile/security audit.

## Critical Pre-Release Findings

- Several SECURITY DEFINER RPCs trust actor UUID parameters more than the current database actor. `claim_reward_atomic` must bind non-service callers to `auth.uid() = p_claimed_by`; business application review and scanner provisioning RPCs are already reached through service-role Edge Functions, so direct authenticated execution can be removed.
- Public child-table RLS policies expose event venues, reward tiers, and leaderboard rows without re-checking parent event visibility. Registered students also need a safe way to read their own non-public event context after registration.
- Mobile scanner calls `scan-qr` without the Supabase publishable `apikey` header, unlike `generate-qr-token`; hosted/local function gateways can reject that shape before the Edge Function logic runs.
- Student QR and reward queries filter registered events to `visibility = PUBLIC`, which drops registered private/unlisted events from the flows that should continue after registration.
- Business event opportunities are cross-joined by membership without checking city, so venues can see irrelevant joinable events outside their city.
- Club staff can reach the organizer events page and see edit/cancel controls for events they cannot manage. Backend/RLS should block writes, but the UI should not invite impossible actions.

## Critical Pre-Release Review Outcome

Implement small, evidence-backed fixes only: one Supabase migration for actor binding/grants/RLS scope, targeted mobile query/header/status fixes, city-scoped business opportunities, and organizer edit-control gating. Larger feature gaps like mobile reward-claim UX and full multi-role switching remain separate product work.

## Current Review (Pre-Release Code Review Refactor Sweep)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Start a comprehensive pre-release code review, security review, and risk-reducing refactor pass after public-site deploy.

## Pre-Release Sweep Initial Findings

- `main` is clean and includes the deployed public gallery polish (`b744395`).
- The repository has three primary runtime surfaces: Expo mobile app (`apps/mobile`), Next.js public/admin/club app (`apps/admin`), and Supabase SQL/Edge Functions (`supabase`).
- Highest-risk invariants to review first are role/session boundaries, anonymous scanner provisioning, QR/stamp/reward atomicity, organizer/admin mutations, public intake hardening, push deep-link routing, and Supabase RLS/RPC grants.
- A full repository-wide Codex Security scan requires a runtime inventory, coverage ledger, and file-by-file pass. This branch starts that process and should not mix unrelated feature work into the review branch.

## Pre-Release Sweep Review Outcome

Use two tracks: code-reviewer subagent for broad correctness/release findings, and Codex Security-guided review for high-impact security boundary coverage. Apply only small refactors or fixes that have clear risk reduction and pass the existing validation suite.

## Current Review (Public Gallery Polish)

- **Date:** 2026-05-06
- **Branch:** `feature/public-gallery-polish`
- **Scope:** Ship the remaining public website gallery/copy worktree changes and verify they are safe to deploy.

## Public Gallery Polish Findings

- The dirty worktree is limited to the public website presentation layer: landing page structure, global public-site CSS, public content/legal copy, navbar aria label, and four static PNG assets under `apps/admin/public/images/public`.
- The diff does not touch auth/session handling, API routes, Supabase queries, Edge Functions, payments, dashboard authorization, or mobile runtime code.
- The new gallery uses static local image paths through Next `Image`, so the main risks are build failures, oversized assets, layout overflow, and visual clutter rather than data/security boundary changes.
- The copy changes are Finnish wording refinements and one aria-label typo fix; they do not alter route semantics or CTA destinations.

## Public Gallery Polish Review Outcome

Treat this as a public-site deploy slice. Validate admin typecheck/lint/build, run a diff-scoped security pass, smoke the rendered homepage at desktop/mobile widths, then merge/push/deploy before starting the broader review/refactor branch.

## Current Review (Business Profile Event Count)

- **Date:** 2026-05-06
- **Branch:** `bug/business-profile-event-count`
- **Scope:** Fix the business profile quick-action event count and run business-side validation/simulator readiness checks.

## Business Profile Event Count Findings

- Hosted Supabase confirms `OmaLeima Bar` currently has 3 active joined events and 0 upcoming joined events.
- `business/scanner` reads `homeOverviewQuery.data?.joinedActiveEvents` and correctly exposes active scanner-ready event venues.
- `business/profile` uses the same overview query, but the `Tapahtumat (...)` quick action renders only `upcomingJoinedEventCount`, so active scanner-ready events are counted as zero.
- The profile quick action navigates to `/business/events`, which contains live, upcoming, past joined events, and opportunities. The badge should therefore count joined active + joined upcoming events for the selected business, not only upcoming events across all memberships.

## Business Profile Event Count Review Outcome

Keep scanner behavior unchanged and fix only the profile summary badge. Derive selected-business active/upcoming event counts from the existing overview data so the profile matches the scanner/event surfaces without adding a new query.

## Current Review (Storage Bucket Listing Hardening)

- **Date:** 2026-05-06
- **Branch:** `feature/storage-bucket-listing-hardening`
- **Scope:** Close Supabase advisor storage listing exposure for public media buckets without breaking existing public object URLs.

## Storage Bucket Listing Hardening Findings

- Hosted Supabase still has three broad `storage.objects` SELECT policies for `announcement-media`, `business-media`, and `event-media` with `roles = {public}`.
- The app code uploads to these buckets and renders public object URLs through `getPublicUrl`; repository search did not find runtime `.list()` usage for these buckets.
- Supabase public buckets can serve known public object URLs without a public `storage.objects` SELECT policy, so the broad read policies add listing surface without being needed by the current app flow.
- The remaining anonymous SECURITY DEFINER execute count includes helper/read functions and should not be blindly revoked in this slice because it could break public listings or RLS helper behavior.

## Storage Bucket Listing Hardening Review Outcome

Remove only the broad public storage object SELECT policies for public media buckets. Keep upload/manage policies unchanged and validate that known public object URLs remain reachable after the hosted migration.

## Current Review (Release Smoke Readiness)

- **Date:** 2026-05-06
- **Branch:** `feature/release-smoke-readiness`
- **Scope:** Re-run release readiness gates after the latest production deploy, align mobile scanner smoke checks with the current QR-only business scanner product decision, and address high-confidence Supabase advisor security findings.

## Release Smoke Readiness Findings

- Hosted Supabase migrations are present through owner QR scanner provisioning, scanner device realtime/model updates, and the department tag merge fix.
- Mobile realtime and native push readiness audits pass in repository wiring mode.
- Android SDK and the `Pixel_9` AVD exist locally, but no Android device or emulator is currently attached.
- The hosted business scanner readiness audit was stale: it still expected the removed manual token scan UI even though the production scanner screen is now camera-based and QR-only.
- Supabase security advisors report many warnings because anonymous auth is enabled. The highest-impact fixable item in this slice is unauthenticated `anon` execute access on SECURITY DEFINER mutation/trigger RPCs.
- Hosted ACL inspection confirmed mutation RPCs had both `=X` and `anon=X` grants. The migration removes `PUBLIC`/`anon` execute for mutation and trigger functions while preserving `authenticated` and `service_role` execute to avoid breaking signed-in app flows.

## Release Smoke Readiness Review Outcome

Keep the production scanner UI QR-only and update only the audit/docs expectations. Manual token entry should stay out of the staff screen; if non-camera smoke is needed later, it should live in a dedicated script rather than operational UI. For security, keep anonymous sign-in enabled for owner QR provisioning but remove unauthenticated RPC execution from privileged mutation functions.

## Current Review (Admin/Mobile Copy Tone Review)

- **Date:** 2026-05-06
- **Branch:** `feature/admin-mobile-copy-review`
- **Scope:** Review and normalize the remaining dirty Finnish copy/localization changes in admin/organizer web panels, public site content, and mobile translations.

## Admin/Mobile Copy Existing Logic Checked

- The dirty diff touches component-local copy maps, public content constants, dashboard route labels, fraud/oversight labels, club claim formatting labels, and the shared mobile translation object.
- The diff does not add new imports, routes, API calls, Supabase queries, Edge Function invocations, RLS policies, payment code, or auth/session logic.
- Several changed labels use slang or unclear action language in sensitive contexts: push sending, fraud review, business application decisions, sign-out, and scanner/business access.
- Some changed public/mobile strings are directionally useful because they are shorter and more student-culture aware, but need a calmer production tone.

## Admin/Mobile Copy Risks

- Overly casual admin copy can make destructive or security-sensitive actions feel less serious.
- Changing translation keys or object shapes would break strict TypeScript checks across admin/mobile.
- Mobile labels must stay compact enough for narrow devices after becoming more professional.
- Public copy should remain distinctive and Finnish-student-culture aware without undermining business trust.

## Admin/Mobile Copy Review Outcome

Keep the diff presentation-only and rewrite copy in place: retain concise event/leima/appro language where it helps the product identity, but replace slang-heavy verbs and dismissive phrasing with clear production UI language. Validate both apps and run a diff-scoped security review to confirm no behavioral surface changed.

## Current Review (Release Smoke Harness Stabilization)

- **Date:** 2026-05-06
- **Branch:** `bug/smoke-fixture-profile-upsert`
- **Scope:** Diff-scoped release/security validation and admin smoke harness compatibility after anonymous-auth profile triggers.

## Release Smoke Harness Stabilization Findings

- Current dirty worktree contains admin/public/mobile Finnish copy changes that are unrelated to the scanner revoke slice. They do not touch auth, RLS, Edge Function, or data mutation logic, but they must be validated because copy changes can still break TypeScript literals, static rendering, or smoke assertions.
- `smoke:club-events`, `smoke:club-claims`, `smoke:club-rewards`, `smoke:club-department-tags`, and `smoke:department-tags` seeded `auth.users` and then inserted the matching `public.profiles` row as if no auth trigger existed. After anonymous-auth/profile trigger hardening, the trigger already creates the profile row, so direct fixture inserts can collide on `profiles_pkey`.
- The longer route-backed club smoke scripts reuse a manual cookie jar. Next/Supabase route handlers can refresh session cookies through `Set-Cookie`; without syncing those response cookies back into the smoke client, later requests in the same script can return `AUTH_REQUIRED` even though earlier requests succeeded.
- The `smoke:department-tags` route content assertion expected the old English static heading `Department tags`. Dashboard copy/localization now allows localized headings, so the smoke should assert dynamic fixture content instead of brittle shell copy.

## Release Smoke Harness Stabilization Review Outcome

This slice should keep product code unchanged and stabilize only smoke fixtures: make profile seeding idempotent with `on conflict`, keep route smoke cookie jars current from response `Set-Cookie`, and avoid brittle static copy assertions. The security pass found no diff-introduced security candidate in the dirty copy changes; the main actionable release issue is the stale smoke harness.

## Current Review (Scanner Revoke Session Cleanup)

- **Date:** 2026-05-06
- **Branch:** `bug/scanner-revoke-session-cleanup`
- **Scope:** Business scanner device self-revoke protection, realtime scanner logout on revocation, and scanner screen manual token removal.

## Scanner Revoke Session Cleanup Findings

- `revoke-business-scanner-access` currently allows an owner/manager to revoke a scanner device even when `device.scanner_user_id` equals the acting user. It skips deleting that auth user, but still marks the active device revoked; on the same phone this makes the scanner register flow return `DEVICE_REVOKED`.
- The business profile device UI does not load `scanner_user_id`, so it cannot distinguish "my current account/device" from a staff scanner device provisioned by the owner QR.
- Scanner devices are not currently added to the Supabase Realtime publication. A scanner device that is revoked while the scanner screen is open will only discover it on the next scan/refresh path, not immediately.
- `business/scanner.tsx` still renders a manual pasted token panel. With the owner QR and live camera flow in place, this is now a QA/testing affordance leaking into the operational scanner UI.

## Scanner Revoke Session Cleanup Review Outcome

This slice should block self-revoke both in UI and Edge Function, expose `scanner_user_id` to the device summary so only other scanner devices can be revoked, add `business_scanner_devices` to realtime, and subscribe the scanner screen to its own device row so a revoked scanner signs out immediately. The manual token input should be removed from the production scanner screen.

## Current Review (Business Owner Onboarding Handoff)

- **Date:** 2026-05-06
- **Branch:** `feature/security-hardening-review`
- **Scope:** Admin business application post-approval owner account and membership handoff.

## Business Owner Onboarding Handoff Findings

- `approve_business_application_atomic()` already creates a `businesses` row linked to the original `business_applications.id`, but it does not create a business owner auth user or `business_staff` membership.
- The admin panel currently explains that operators should use bootstrap scripts after approval. That is not a production-ready admin workflow because it leaves account delivery outside the UI.
- The existing review API pattern is safe: Next.js route checks platform-admin access, then invokes a Supabase Edge Function that uses service-role and database RPCs. The owner onboarding action should follow the same pattern.
- Owner account linking needs to be idempotent. Re-clicking the action should reuse the existing profile/auth user and existing `business_staff` membership instead of creating duplicates.
- Scanner staff no longer needs password delivery because owner-QR scanner provisioning exists. The business owner handoff should therefore focus on owner access and clear scanner QR onboarding instructions.

## Business Owner Onboarding Handoff Review Outcome

This slice should add a post-approval admin action that creates or reuses the contact email auth user, links it as `BUSINESS_OWNER` + `business_staff OWNER`, and returns a recovery/onboarding link when Supabase can generate one. The reviewed applications read-model should show whether a business and owner membership already exist.

## Current Review (Scanner Provisioning Duplicate Scan + Device Cleanup)

- **Date:** 2026-05-06
- **Branch:** `bug/scanner-provisioning-device-cleanup`
- **Scope:** Business owner QR scanner provisioning duplicate camera callbacks, Edge Function error visibility, and business scanner device list cleanup.

## Scanner Provisioning Duplicate Scan + Device Cleanup Findings

- Supabase Edge Function logs show the reported flow clearly: a `provision-business-scanner-session` `200` response is followed immediately by many `400` responses for the same QR flow. This means the camera callback is firing multiple times before React state disables scanning.
- `BusinessQrSignIn` uses `isProvisioning` React state as the only duplicate guard. State updates are asynchronous, so several `onBarcodeScanned` callbacks can enter the async provisioning path before `isProvisioning` becomes true in the closure.
- Each duplicate callback signs out, signs in anonymously, and calls the provisioning Edge Function again. After the first success consumes the QR grant, duplicates fail with non-2xx responses; repeated anonymous sign-ins then hit Supabase Auth rate limits.
- Mobile currently surfaces Supabase Functions HTTP errors as the generic `Edge Function returned a non-2xx status code` message. The Edge Function response body already contains useful status/details, but mobile does not read it.
- `useBusinessScannerDevicesQuery` loads all scanner devices for a business, including `REVOKED`. That makes deleted devices continue appearing as `Poistettu`, while the requested product behavior is to remove them from the visible list.
- The hosted `provision-business-scanner-session` function currently maps most RPC non-success statuses to `FORBIDDEN`, losing specific statuses such as `QR_INVALID`, `QR_CONTEXT_MISMATCH`, and `ACTOR_NOT_ALLOWED`.

## Scanner Provisioning Duplicate Scan + Device Cleanup Review Outcome

This slice should add a synchronous ref lock and close the camera immediately after a QR read so only one provisioning transaction can start per scan. Mobile should parse Edge Function HTTP response bodies for actionable error messages. Business device listing should query only active devices so revoked devices disappear after successful revoke. The Edge Function should preserve specific provisioning statuses in error responses and then be redeployed.

## Current Review (Scanner QR Login Redirect Regression)

- **Date:** 2026-05-06
- **Branch:** `feature/security-hardening-review`
- **Scope:** Business owner QR scanner login flow after anonymous-auth security hardening.

## Scanner QR Login Redirect Regression Findings

- Business QR login intentionally starts with `supabase.auth.signInAnonymously()` and then calls `provision-business-scanner-session` to activate the anonymous profile as `BUSINESS_STAFF/SCANNER`.
- After the security hardening, anonymous profiles are correctly created as `SUSPENDED`. This is safe, but it creates a short-lived transitional state during QR provisioning.
- The mobile auth layout and login screen both subscribe to `useSessionAccessQuery(session.user.id)`. As soon as anonymous sign-in succeeds, that query can resolve the transitional `SUSPENDED/STUDENT` profile as `unsupported` before provisioning finishes.
- React Query can then keep the stale `session-access` result for the same anonymous user id. Even if the Edge Function successfully updates the profile to `ACTIVE` and creates `business_staff`, the business layout may still read the cached unsupported access and bounce the user away from scanner mode.
- `BusinessQrSignIn` currently navigates directly to `provisionedSession.homeHref` after the Edge Function response without invalidating/refetching session access for the newly provisioned anonymous user.
- `AnnouncementPopupBridge` also enabled on any authenticated session, not on resolved role access. During QR provisioning this let public popup announcements render over the business login screen while anonymous scanner activation was still in flight.
- Scanner-only devices are operational kiosks, so announcement popups and announcement push deep-links should not compete with the scanner route.

## Scanner QR Login Redirect Regression Review Outcome

The QR login should explicitly treat anonymous sign-in as a provisioning transaction: capture the anonymous user id, call the provisioning Edge Function, invalidate/refetch `session-access` for that user, verify the resolved access is business/scanner, and only then navigate to `/business/scanner`. Announcement popup/push bridges must wait for resolved non-scanner access and stay quiet during provisioning. This keeps suspended-by-default anonymous auth secure without letting stale access cache or modal bridges redirect/distract the scanner back to login.

## Current Review (Anonymous Auth Security Hardening)

- **Date:** 2026-05-06
- **Branch:** `feature/security-hardening-review`
- **Scope:** Anonymous Supabase Auth enablement, RLS privilege expansion, profile role/status integrity, public intake bypasses, and push/device token registration guardrails.

## Anonymous Auth Security Hardening Findings

- Hosted Supabase anonymous sign-in is now enabled and a real anonymous sign-in smoke succeeds. Anonymous users receive the Postgres `authenticated` role, so every `to authenticated` policy must now be treated as reachable before Google/password identity proof.
- `handle_new_auth_user()` currently creates email-less anonymous users with the default `profiles.status = ACTIVE` and `profiles.primary_role = STUDENT`. That makes scanner provisioning possible, but it also turns anonymous sessions into active student identities before any QR provisioning step.
- `profiles` has an own-row update policy with only `id = auth.uid()` checks. Because RLS cannot restrict columns by itself, an authenticated or anonymous user could attempt to change sensitive fields such as `primary_role` or `status` unless the database blocks those writes explicitly.
- `business_applications` still has an authenticated insert policy from a previous integrity migration. With anonymous auth enabled, direct Supabase inserts can bypass the public `/api/business-applications` Turnstile, origin, honeypot, fill-time, and validation controls.
- `support_requests` allows authenticated users to create own support requests. That is acceptable for real active profiles, but anonymous suspended profiles should not be able to create support spam through direct Supabase client calls.
- `register-device-token` authenticates the bearer token but does not check that the profile is active. Suspended anonymous users should not be able to register push tokens before becoming a provisioned scanner or real user.

## Anonymous Auth Security Hardening Review Outcome

This slice should keep anonymous sign-in available for owner-QR scanner onboarding, but make anonymous profiles suspended-by-default and require explicit backend provisioning to activate scanner accounts. Sensitive profile fields must be protected at the database trigger layer, direct public intake must stay behind server-side Turnstile routes, and push/support write surfaces must require active profiles.

## Current Review (Owner QR Scanner Provisioning)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Business owner QR-based scanner provisioning across Supabase auth/device lifecycle and mobile business login/profile surfaces.

## Owner QR Scanner Provisioning Findings

- The project already has a solid scanner-device base: `business_scanner_devices`, registration RPCs, PIN support, scanner-only routing, and mobile device summaries. The missing piece is not scanning itself; it is credential-less staff onboarding.
- Current scanner login is email/password based. That forces business owners to share credentials with staff, which creates a real offboarding and accountability problem when employees leave.
- Supabase hosted state was checked with the Supabase MCP: production has no owner-QR scanner provisioning edge functions yet, and its latest migration is `fix_profile_department_tag_primary_merge_order`.
- Supabase anonymous auth is the cleanest fit for device-local scanner accounts, but local config currently has anonymous sign-ins disabled and the auth profile trigger rejects email-less users. This must be fixed before the mobile QR login can work reliably.
- Scan history and stats must remain business-owned even if a scanner device/account is revoked. Existing `stamps.scanner_user_id` and `qr_token_uses.scanner_user_id` constraints need to allow scanner user deletion without deleting historical event/business facts.
- Revoking a device via the current RPC only marks `business_scanner_devices.status = REVOKED`. The requested lifecycle needs a service-role edge function that also disables/deletes the provisioned scanner auth user when the device belongs to a QR-provisioned scanner.

## Owner QR Scanner Provisioning Review Outcome

This slice should reuse the existing device table and scanner-only app routing, but add a secure QR grant layer: owner/manager generates a short-lived signed QR, scanner device signs in anonymously, provisioning atomically consumes the QR grant and creates an active `BUSINESS_STAFF/SCANNER` membership, and revocation removes that scanner access while preserving historical scan records.

## Current Review (Public Website Simplification Redesign)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Public website landing and companion public pages (contact, apply, legal) with a cleaner, less crowded art-directed layout.

## Public Website Simplification Redesign Findings

- The current landing page has too many equally loud sections: hero, flow, large gallery, culture/story, growth model, pricing, support, and contact CTA. Even though each section is individually valid, together they dilute the message and make the page feel busy.
- The public site still carries `growth model` and `pricing` storytelling that the user explicitly wants removed from this redesign pass. It adds strategic explanation where the homepage should instead behave like a poster plus a short product story.
- `landing-page.tsx` also still imports `PricingCheckoutButton` and exposes `checkoutStatus`, so the public entrypoint is still shaped around self-serve Stripe even though the requested direction is manual contact/application and a simpler website.
- The best reference direction from the user image is not “more components”; it is stronger hierarchy: one bold hero, three compact flow cards, one focused feature band, one short proof/support area, and a restrained footer.
- Existing public pages (`contact`, `apply`, `legal`) already reuse the same navbar/footer, but visually they do not yet feel like part of the same calmer poster-like system as the desired landing direction.
- The repo already has enough public assets for support sections, but the hero benefits from a new cleaner editorial image with controlled negative space. A new generated hero asset can give the page a stronger first impression without introducing bright off-theme colors.

## Public Website Simplification Redesign Review Outcome

This slice is now implemented as a smaller poster-style public site: the landing is reduced to hero, three-step flow, one product spotlight, one event-day proof block, and one closing CTA. Pricing/Stripe-driven homepage surfaces were removed, a new generated hero image is in place, and contact/apply/legal now use the same calmer shell so the public website reads as one coherent system instead of an accumulated set of sections.

## Current Review (Cross-Role Mobile Design Audit Round Two)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Remaining dense Student, Club, and Business mobile screens after the first subtraction pass, with a focus on hierarchy, reduced explanatory copy, and flatter operational surfaces.

## Cross-Role Mobile Design Audit Round Two Findings

- The first mobile audit removed the loudest strategy copy, but the next bottleneck is now layout density rather than outright wrong content. Several screens still stack too many framed sections with generic headings like `Preferences`, `Profile settings`, or `Scanner workflow`, which makes the product feel heavier than it needs to.
- `apps/mobile/src/app/student/profile.tsx` is functionally sound, but the current split between profile hero and a second large settings card adds an unnecessary layer of heading chrome. Notification setup also explains too much for a surface that should feel like quick account maintenance.
- `apps/mobile/src/app/student/leaderboard.tsx` still carries duplicated orientation signals: a page heading, another event chooser heading, selected-event title, standings heading, and a separate current-user spotlight block. The flow is correct, but the page reads more like stacked modules than one continuous ranking workspace.
- `apps/mobile/src/app/business/scanner.tsx` is the highest-value operational screen and therefore the one that most benefits from restraint. The current top meta paragraph is too long, and the manual token area is visually too prominent for a fallback/testing tool. The scanner should read as kiosk-first, with secondary tools visually demoted.
- `apps/mobile/src/app/business/profile.tsx` and `apps/mobile/src/app/club/profile.tsx` both still feel card-heavy. The core information is valid, but headings and explanatory rows repeat the same intent, and collapsible/profile surfaces can be tightened without reducing capability.
- `apps/mobile/src/app/club/upcoming.tsx` already has good data density, but the top subtitle and the framed filter block still spend too much vertical space before the user reaches the event cards.
- `apps/mobile/src/app/student/updates.tsx` is close to good already; the remaining issue is small but real: its extra descriptive line does not add enough value to justify the space on a feed-first screen.

## Cross-Role Mobile Design Audit Round Two Review Outcome

This slice should keep the current dark/lime theme and shared components, but compress hierarchy across the remaining dense screens. The rule is simple: keep orientation, keep action, keep state, and remove the extra sentence or frame whenever the screen already proves its purpose through content.

## Current Review (Cross-Role Mobile Design Audit)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Student, organizer, and business mobile screens with a product-design audit focused on clutter, repetition, weak hierarchy, and missing restraint.

## Cross-Role Mobile Design Audit Findings

- The overall theme system is strong enough; the main issue is not color, but density and mixed intent. Several mobile surfaces still contain internal business-model storytelling that belongs in the website or admin context, not inside operational app screens.
- `apps/mobile/src/app/business/home.tsx` renders a `growthCard` about verified student traffic, sponsor slots, and reports. This is product strategy copy shown to a business operator who is trying to run scanning and event participation, so it competes with the actual job-to-be-done.
- `apps/mobile/src/app/club/home.tsx` renders a similar `growthCard` about organizer monetization. On organizer mobile this reads like internal pitch material and breaks the otherwise event-day operational focus.
- Student surfaces have a second kind of clutter: kinetic UI that explains its own carousel mechanics. `apps/mobile/src/app/student/events/index.tsx` shows `Auto` beside the hero rail metadata, and `apps/mobile/src/app/student/rewards.tsx` explains that the rewards rail slides automatically when idle. That copy is ornamental, not useful.
- The repeated design smell across roles is "telling the user how the UI works" or "telling the operator how the business works" instead of keeping the screen centered on the user’s current task.
- Shared operational components like `InfoCard`, rail sections, and announcement feeds are already visually cohesive enough that this slice can improve clarity by subtraction rather than by introducing new ornamental UI.

## Cross-Role Mobile Design Audit Review Outcome

This slice should keep the existing dark/lime visual language, but remove strategy/pitch blocks from business and organizer mobile homes, and strip self-explanatory carousel chrome from student event/reward rails. The target feel is calmer, more premium, and more role-specific: each screen should foreground action, status, and decision-making rather than product narration.

## Current Review (Organizer Announcement Edit Focus + Login Language Menu)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Club mobile announcement edit visibility and login language selector UX cleanup.

## Organizer Announcement Edit Focus + Login Language Menu Findings

- Club mobile `announcements` screen fills the form with the tapped record for edit, but the user can stay deep in the lower feed area and never see that the edit state actually started. The form title changes, yet it is above the fold and easy to miss.
- `AppScreen` owns the root `ScrollView`, but it does not expose a ref. Screens like club announcements therefore cannot intentionally scroll the main surface back to the form after a row tap.
- Login screen language switching currently uses two full-width visible pills near the top of the card. Functionally correct, but visually noisy and harder to scale as the auth surface evolves.
- `AppIcon` already contains `globe` and `chevron-down`, so the requested icon-first language affordance can be implemented without adding a new dependency or SVG asset.
- The requested polish fits the existing dark/lime design language best when treated as a compact utility control rather than another primary segmented selector.

## Organizer Announcement Edit Focus + Login Language Menu Review Outcome

This slice should expose the root scroll position to the club announcements screen, auto-scroll back to the form when an announcement enters edit mode, and replace the visible FI/EN pill row on login with a compact globe-triggered dropdown menu that preserves the existing `useUiPreferences()` language state.

## Current Review (Announcement Push Reliability + Dashboard Locale Cohesion)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Announcement push failure clarity and guardrails, admin/organizer dashboard locale consistency, department-tag merge primary-tag conflict, and mobile announcement push deep-link/source visibility.

## Announcement Push Reliability + Dashboard Locale Cohesion Findings

- Admin/club web `send push` action currently treats every non-2xx Edge Function response as the generic Supabase SDK message `Edge Function returned a non-2xx status code`. The actual function body already returns useful statuses like `ANNOUNCEMENT_ALREADY_SENT`, `ANNOUNCEMENT_NOT_ACTIVE`, and `NOTIFICATION_RECIPIENTS_NOT_FOUND`, but the transport layer drops that context.
- `AnnouncementsPanel` enables `Send push` for every `PUBLISHED` record, even when the announcement has not started yet, has already ended, or already has successful delivery rows in `notifications`. Those cases predictably fail in the Edge Function and look random from the UI.
- Admin/organizer dashboard locale switching is only fully wired on a subset of pages and panels. Some pages pass `DashboardLocale` into shell/panels, while others still rely on hard-coded English strings inside page bodies or panel components. This produces mixed-language sessions even when the cookie itself works.
- The reported `idx_profile_department_tags_one_primary` merge failure is caused by the `sync_department_tag_profile_links()` trigger order. During a merge it promotes the target link to `is_primary = true` before the old source primary is removed or demoted, creating a transient second primary row for the same profile.
- Mobile announcement detail already knows whether the item comes from a club or the platform, but the detail copy only shows `clubName ?? "OmaLeima"`. The user specifically wants the sender/source made explicit, especially for platform support announcements.
- Notification tap handling is currently only captured in `NativePushDiagnosticsProvider`. There is no production router bridge that reads Expo notification responses and routes the signed-in user to the matching announcement detail screen, so push delivery works but click-through does not.

## Announcement Push Reliability + Dashboard Locale Cohesion Review Outcome

This slice should surface real announcement push errors back to the web UI, disable obviously unsendable push actions before the user clicks them, localize the announcement and department-tag moderation surfaces through the same dashboard locale cookie flow, fix the primary-tag merge ordering at the database trigger layer, and add a mobile notification-response bridge that routes announcement pushes directly into the role-appropriate detail screen while also showing the sender/source clearly in the detail UI.

## Current Review (Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Student leima-pass duplicate stamp rendering, public brand navigation, monthly-only pricing/subscription checkout, and business apply/login Turnstile resilience.

## Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience Findings

- Student event detail verisi venue stamp state'ini `Map(business_id -> stamp)` ile tek kayda indiriyor. Bu nedenle ayni business'ten iki gecerli stamp backend'de bulunsa bile `StudentLeimaPassCard` en fazla bir toplanmis slot gorebiliyor.
- `StudentLeimaPassCard` collected slot listesini venue bazli uretiyor; stamp adedi degil venue adedi kadar ikon ciziyor. Ayni mekandan toplanan ikinci leima UI'da dogal olarak kayboluyor.
- Public navbar brand link'i hala `href="#top"` kullaniyor. `/apply`, `/contact` veya `/en/*` gibi sayfalarda bu sadece ayni sayfada scroll dener; kullaniciyi gercek ana sayfaya goturmuyor.
- Public pricing yapisi hala uc farkli tek-seferlik pilot paket mantiginda. Kullanici istegi bunun yerine tek bir aylik 29.99 EUR B2B plan.
- Stripe Checkout route'u daha once one-time payment icin sertlestirilmis olsa da subscription mode'a gecince `line_items.price_data.recurring` ve `mode: "subscription"` gerekir; `invoice_creation` gibi payment-only alanlar cikarilmalidir.
- `business-application-form.tsx`, `contact-form.tsx` ve `admin-login-panel.tsx` Cloudflare Turnstile'i explicit `window.turnstile.render(...)` ile kuruyor. Kullanicinin rapor ettigi CSP / Trusted Types / inline script sikayetleriyle birlikte dusununce, official implicit widget markup daha dayanikli ve daha az script bagimli bir yol.
- Live `/apply` response'unda uygulamanin kendi code-level CSP header'i gorunmuyor; dolayisiyla mevcut kirilma buyuk ihtimalle explicit render yolunun tarayici/policy kombinasyonlariyla surtusmesinden geliyor, yalnizca origin/server route reddinden degil.
- Scanner QR ile owner-device provisioning fikri mevcut `business_scanner_devices` altyapisiyla uyumlu gorunuyor; fakat bugunku scan auth kontrati dogrudan `auth.uid()` uzerinden aktif `business_staff` uyeligi bekliyor. Bu nedenle tam credential-less owner-QR scanner girisi ayri bir auth/device lifecycle slice'i gerektiriyor.

## Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience Review Outcome

Bu slice'ta leima-pass ayni business'ten gelen coklu stamp'lari sayi olarak gostermeli, public brand link'i locale-aware home route'una donmeli, pricing tek aylik 29.99 EUR recurring Stripe Checkout'a inmeli ve apply/login/contact Turnstile yuzeyleri implicit widget render ile daha dayanikli hale gelmeli. Owner-QR scanner provisioning icin ise mevcut device altyapisi reuse edilecek, ama auth model degisimi gerektirdigi icin ayri bir implementation parcasi olarak ele alinacak.

## Current Review (Stripe Live Checkout + Event Stamp Limit Parity)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Stripe live checkout production activation, reminder warning confirmation, and same-venue stamp-limit parity across mobile/web organizer flows.

## Stripe Live Checkout + Event Stamp Limit Parity Findings

- Production pricing checkout initially failed with two real live-mode Stripe integration issues: `customer_update` was being sent without an explicit `customer`, and inline `price_data` had no explicit `tax_behavior` while live Stripe Tax settings did not define a default. Both caused hard `500` responses from `/api/pricing/checkout`.
- Vercel production now has the required Stripe env pair present (`STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`), but those env changes only matter after a fresh production deploy.
- The previously reported reminder warning root cause remains the invalid SecureStore key format. The current mobile reminder bridge already uses `student_event_reminder_fired_v1`, which is compatible with Expo SecureStore's key restrictions.
- Mobile club event create/update flow had two real rule regressions: organizer edits overwrote the entire `events.rules` object with a fresh `stampPolicy` object, and legacy string-form `stampPolicy.perBusinessLimit` values were read as the default `1`. Editing an unrelated field could therefore silently tighten or erase stored event rules.
- Web organizer rule builder had the same shape problem in a different form: it preserved top-level JSON keys but still replaced the whole `stampPolicy` object, and its server validation rejected legacy digit-string `perBusinessLimit` values. That made mobile/web parity incomplete.
- The backend scan rule already enforces `perBusinessLimit` as a cap on how many separate valid stamps a student may collect from the same business during an event. It does not mean one scan yields multiple stamps. The current DB function compares existing valid stamp count against the configured per-business limit before returning `ALREADY_STAMPED`.

## Stripe Live Checkout + Event Stamp Limit Parity Review Outcome

This slice should keep Stripe checkout fail-closed but production-ready, preserve existing event rules during organizer edits, normalize legacy stamp-limit values on both mobile and web, and clarify the "same venue limit" UX so it reads as a total-per-event cap rather than a multi-stamp-per-scan setting.

## Current Review (Student Event Detail + Reminder Warning Cleanup)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Student mobile event detail timeline/rules rendering, reminder SecureStore warnings, and the reported event cover prefetch warnings.

## Student Event Detail + Reminder Warning Cleanup Findings

- Student event detail hero badge `getEventTimelineBadge()` icinde veritabani `status` alanina kismi olarak guveniyor. Student event listesi ise saf zaman bazli bucket kullaniyor. Bu fark yuzunden gelecekteki bir event detail ekraninda `päättynyt` gibi yanlis badge gorunebiliyor.
- Event detail `Rules` bolumu `Object.entries(event.rules)` + `JSON.stringify()` ile ham JSON gosteriyor. `stampPolicy` verisi object, string veya eski array-semantigi ile gelebilecegi icin kullaniciya `perBusinessLimit` gibi raw backend formatlari siziyor.
- `student-event-reminders.ts` icindeki SecureStore key'i `student-event-reminder-fired:v1` seklinde `:` iceriyor. Expo SecureStore bu karakteri key icinde kabul etmedigi icin `student-event-reminder-clear-failed` ve `student-event-reminder-sync-failed` warning'lerinin kok nedeni bu.
- Kullanici logunda paylastigi iki event cover URL'si artik public olarak saglikli donuyor: `HEAD` istekleri `HTTP 200` ve anlamli `content-length`, `Range bytes=0-0` istekleri `HTTP 206` ile 1 byte dondu. Bu da raporlanan prefetch warning'lerinin su andaki bu iki obje icin aktif storage bozuklugu gostermedigini, daha cok onceki gecici durum veya stale cihaz logu oldugunu dusunduruyor.

## Student Event Detail + Reminder Warning Cleanup Review Outcome

Bu slice'ta event detail badge ve registration gating student listesiyle uyumlu sekilde zaman bazli hale getirilecek, `stampPolicy` insan-okunur metne cevrilecek, SecureStore key'i platform-safe karakter setine alinacak ve prefetch warning'i icin kod yerine once runtime gercek durumu dogrulanmis olacak.

## Current Review (Pricing Checkout + Announcement/Admin Reliability)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Mobile announcement image/detail polish, mobile login language selector, public pricing Stripe checkout flow, and organizer/admin panel action reliability.

## Pricing Checkout + Announcement/Admin Reliability Findings

- Mobile announcement detail ekraninda gorunen ayri bir zoom CTA artik yok, fakat modal hala tum frame'i dolduran `CoverImageSurface` kullaniyor. Kullanici istegi "resme tikla, orijinal boyutta gor" oldugu icin zoom yuzeyi tam ekran `contain` mantigina cekilmeli ve gorunen ekstra aksiyon kalmamali.
- Mobile login ekrani `useUiPreferences()` icinden sadece `copy` okuyor. Uygulama genelinde kalici `setLanguage()` altyapisi zaten mevcut, fakat giris sayfasinda hizli FI/EN secici yok.
- Public pricing section su an tamamen application CTA'larina bagli. Stripe entegrasyonu yok, checkout route yok ve public package metni hala "Price ID'ler netlesince baglanir" diye bekleme durumunda.
- Finlandiya vergi tarafinda guncel resmi kaynaklara gore genel KDV/ALV orani 2026 itibariyla `%25.5`. B2B akista sabit tax-rate hard-code etmek yerine Stripe Checkout + `automatic_tax` + `tax_id_collection` kullanmak daha guvenli; bu sayede Finlandiya ve diger uygun AB senaryolarinda vergi hesabini Stripe yapar.
- `/club/announcements` ve `/admin/announcements` ayni `AnnouncementsPanel` component'ini paylasiyor. Bu yuzden paneldeki `Edit`, `Archive`, `Send push` akislari tek yerde duzeltilirse iki role de ayni anda etki eder.
- `Edit` butonu formu doldursa bile kullanici announcements tab'inda kalabiliyor; bu da buton calismiyor hissi veriyor. Ayrica push response metriği client parse'da kaybolursa kullanici teslimat sonucunu eksik goruyor.
- Admin panel icin mevcut smoke script zemini var: `smoke:routes`, `smoke:business-applications`, `smoke:club-events`, `smoke:club-rewards`, `smoke:club-claims`, `smoke:club-department-tags`, `smoke:department-tags`, `smoke:oversight`. Bu turda panel buton/row auditini kod incelemesi + mevcut smoke scriptleriyle birlestirmek mantikli.

## Pricing Checkout + Announcement/Admin Reliability Review Outcome

Bu slice'ta mobile login'e kalici dil secici eklenecek, announcement detail image zoom yuzeyi sadeleştirilecek, public pricing Stripe Checkout Sessions ile Finlandiya ALV mantigina uygun sekilde canli checkout-ready hale getirilecek, shared announcements paneldeki tab/action sorunlari kapatilacak ve organizer/admin yuzeyleri mevcut smoke scriptleriyle tekrar taranacak.

## Current Review (Student Event Time Awareness + Venue Discovery)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Student mobile event list, countdown/reminder flow, event detail registration/venue UX, leaderboard filtering, and leima-pass venue identity feedback.

## Student Event Time Awareness + Venue Discovery Findings

- `useStudentEventsQuery` aktif ve yaklasan eventleri fetch anindaki `Date.now()` ile bucket'liyor. Ekran acik kaldiginda `UPCOMING -> ACTIVE` gecisi ancak manuel refresh/refetch ile gorunuyor.
- Student Events ekrani zaten `activeEvents` + `upcomingEvents` uzerinden lokal discovery/render yapiyor; bu yuzden mevcut query sonucunu ekranda yeniden zamanlayarak gecisi UI tarafinda cozmeye uygun.
- Event card premium compact layout'a gecmis durumda, fakat kayitli ogrenci icin `son 60 dakika` countdown veya reminder gorselligi yok.
- Push altyapisi `presentLocalNotificationAsync` ve reward notification bridge uzerinden hazir. Event reminder icin eksik parca, kayitli eventlerin `startAt - 60 dakika` noktasina gore schedule/dedupe yapan ogrenci-side bridge.
- Event detail route kayit/yoklama yuzeyini her durumda render ediyor. Kullanici istegine gore event basladigi anda bu `Ilmoittautuminen` blogu kalkmali.
- Event detail'de venue'ler buyuk statik kartlar halinde listeleniyor. Kullanici daha kucuk kartlar, venue'ye tiklayinca detay/reward/map aksiyonu istiyor.
- `StudentEventVenueMap` mevcut ama sadece map preview ekraninda kullaniliyor. Venue detayinda haritaya gecis icin ayni external maps mantigi tekrar kullanilabilir.
- Leaderboard'da event secici zaten var; sayfayi bogmadan tarih filtresi eklemek icin event chip rail'inin ustune kucuk tarih chip katmani eklemek yeterli.
- `StudentLeimaPassCard` stamp toplayan mekanlarin ikonlarini gosteriyor ama bunlar tiklanabilir degil; kullanici hangi mekan oldugunu hizli popup ile gorebilmek istiyor.

## Student Event Time Awareness + Venue Discovery Review Outcome

Bu slice'ta mevcut query/realtime yapisini bozmadan event verisi ekranda yeniden zamanlanacak, kayitli upcoming eventler icin local reminder bridge eklenecek, event detail kayit yuzeyi baslangic sonrasi kaldirilacak, venue'ler compact kart + detail modal akisina gecirilecek, leaderboard hafif tarih filtreleri alacak ve leima pass mekan kimligi popup ile tamamlanacak.

## Current Review (Login Protection + Pricing/Business Intake)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Add Cloudflare Turnstile to admin login, add optional Finland-only access guard, publish practical pricing/business package, wire public business applications into the admin review queue, and close announcement popup after "Näytä lisää".

## Login Protection + Pricing/Business Intake Findings

- `/login` used client-side Supabase password/OAuth without a Cloudflare challenge. Existing contact form already proved Turnstile keys and server-side validation are available, so the login page can use the same token validation model before starting Supabase auth.
- Cloudflare docs require server-side Turnstile validation; the widget alone is not protection. Login now needs a backend validation endpoint so forged tokens fail before password or Google auth begins.
- Full Finland-only blocking is technically possible with Cloudflare WAF country rules or Vercel/Cloudflare country headers, but product-wise it is risky for SEO, App Store review, exchange students, roaming users, VPNs, and organizers traveling outside Finland. A safer first step is an env-controlled geofence mode that defaults off and can protect admin/login first.
- The public contact form has a `business_signup` subject, but it creates `public_contact_submissions`, not rows in `business_applications`. Admin `/admin/business-applications` therefore needed a real public application intake path.
- The current business approval flow already creates the business profile atomically. The missing piece was explaining the post-approval scanner/account handoff and making the public website send real applications to that queue.
- The pricing package should not invent live Stripe payments without confirmed products, VAT/invoicing, and Stripe Price IDs. The safe slice is to publish pricing, route businesses into the admin queue, and make the package Stripe Checkout-ready once IDs exist.
- Announcement popup "Näytä lisää" pushed the detail route while the unread popup remained visible over the destination. It needed a local dismiss state for the opened announcement.

## Login Protection + Pricing/Business Intake Review Outcome

Admin login now requires a Turnstile preflight for password and Google login when a site key is configured. A shared server-side Turnstile validator and client IP helper were added. `/apply` and `/en/apply` now submit protected business applications directly into `business_applications`; the public landing includes a pricing section with the free core, verified traffic, and premium event ops packages. Admin business applications now explains account/scanner credential handoff. Optional geofence proxy is available via `OMALEIMA_GEOFENCE_MODE=admin|all`, defaulting to `off`. Announcement popup closes locally after opening detail.

## Current Review (QR Refresh + Navigation/Layout Regression)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Student QR refresh failure, announcement detail back/zoom behavior, and admin/organizer dashboard fixed sidebar + locale consistency.

## QR Refresh + Navigation/Layout Findings

- Student QR token refresh called the hosted `generate-qr-token` Edge Function with the user bearer token but without the Supabase `apikey` header. The Edge gateway can reject that request before the function logic runs, which matches the generic `QR päivitys epäonnistui` UI.
- The QR screen hid the underlying function error message, making auth/registration/event-window issues indistinguishable from gateway failures.
- Announcement detail used `router.back()` when a stack existed. If the user entered detail from Info after previously visiting Events, the native stack could return to Events instead of the explicit role-specific updates route.
- The visible `Suurenna kuva` pill duplicated the image tap affordance. The detail hero can use the whole image as the tap target and open the zoom modal directly.
- Dashboard sidebar was `sticky` inside the document flow. Long content could scroll the sign-out/menu region out of view. A fixed viewport sidebar with only the nav list scrollable is the safer desktop layout.
- Dashboard locale defaulted to English when no cookie existed, while some pages/panels had explicit Finnish handling. That made navigation feel mixed between Finnish and English.

## QR Refresh + Navigation/Layout Review Outcome

The QR request now sends the public Supabase API key with the bearer token and displays the exact refresh error detail below the friendly message. Announcement detail back navigation now uses the explicit role route, image zoom opens by tapping the image without a visible pill button, dashboard desktop sidebar is fixed, and dashboard locale defaults to Finnish unless the user switches it.

## Current Review (Student Info IA + Turnstile Production Finish)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Fix student tab label overflow, move duplicated student value/update surfaces to the right screens, add Turnstile production envs, deploy, and smoke contact protection.

## Student Info IA Findings

- Student bottom tab used full Finnish `Tapahtumat`, which can overflow on narrow physical iPhones. Route and page title can remain unchanged while the tab label uses shorter FI copy.
- `Miksi OmaLeima` was useful onboarding/value copy, but placing it on the logged-in Events page duplicates the event discovery job and pushes event content down.
- Login already has an image-backed auto-advancing hero rail, so the value copy belongs there as an additional slide.
- Events had a compact announcement rail, while Info already had a full stacked announcement feed. That made announcements appear in two places and the stacked feed became visually heavy.
- Student clubs already use a horizontal rail; keeping them inside Info below a horizontal announcement rail matches the requested “own scroll” behavior.
- Vercel production lacked only the Turnstile pair. After adding both keys and redeploying, `/contact` HTML includes the Turnstile script and site key. API submit without a generated token returns `Verification failed`, confirming fail-closed protection.

## Student Info IA Review Outcome

The student Events tab label is shortened to `Eventit` in Finnish, Events page no longer renders `Miksi OmaLeima` or announcement preview rail, Login hero carries the `Miksi OmaLeima` value slide with an image background, and Info now owns a horizontal `Tiedotteet` rail plus the existing horizontally scrollable student club rail. Turnstile envs are installed in Vercel production and production deploy passed.

## Current Review (Announcement Realtime Crash + Turnstile Retry)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Fix the physical iPhone render crash in the announcement feed realtime hook and retry Cloudflare Turnstile access without exposing secrets.

## Announcement Realtime Crash Findings

- The iPhone error showed Supabase Realtime rejecting a `postgres_changes` callback because the channel was already subscribed for topic `announcement-feed:{userId}`.
- The feed section can be mounted more than once and hot reload/native recovery can leave the same topic in a subscribed state. Reusing the plain user-scoped topic is therefore too fragile for mobile runtime.
- Query invalidation does not depend on the channel topic value; it only needs a live `postgres_changes` callback that invalidates the existing user-scoped React Query keys.
- Vercel production currently has `SUPABASE_SERVICE_ROLE_KEY` and `CONTACT_IP_HASH_SECRET`, but not the Turnstile pair. Local env/examples describe the pair, but no real `NEXT_PUBLIC_TURNSTILE_SITE_KEY` or `TURNSTILE_SECRET_KEY` value was found locally.
- Cloudflare MCP and Wrangler-local checks still cannot authenticate to the target Cloudflare account; the API returns `10000 Authentication error`.

## Announcement Realtime Crash Review Outcome

The announcement realtime channel now uses a hook-instance-specific topic suffix while preserving the same query invalidation behavior. This prevents subscribed topic reuse from crashing the feed screen. Turnstile remains blocked on Cloudflare auth or user-provided real keys; fake production keys were intentionally not added.

## Current Review (Business/Admin Workflow Parity Polish)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Business mobile devices/history density; admin/organizer web workflow clarity; event cover upload; reward-event assignment clarity; admin shell fixed sidebar.

## Business/Admin Workflow Parity Affected Files

- `apps/admin/src/app/api/dashboard-locale/route.ts`
- `apps/admin/src/app/admin/business-applications/page.tsx`
- `apps/admin/src/app/club/events/page.tsx`
- `apps/admin/src/app/club/rewards/page.tsx`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/src/features/dashboard/components/dashboard-shell.tsx`
- `apps/admin/src/features/dashboard/i18n.ts`
- `apps/admin/src/features/business-applications/components/business-applications-panel.tsx`
- `apps/admin/src/features/club-events/components/club-events-panel.tsx`
- `apps/admin/src/features/club-events/media-upload.ts`
- `apps/admin/src/features/club-rewards/components/club-rewards-panel.tsx`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Business/Admin Workflow Parity Findings

- Business profile already loads scanner devices with rename/PIN/revoke operations, but the list is always expanded and takes too much room for daily use. It can become a collapsible management block without changing scanner device APIs.
- Business history accepted rows repeat explanatory success text for every valid scan. This makes `Hyväksytty` cards visually heavy although the accepted state is already clear from the chip and timestamp.
- `/admin/business-applications` has a working backend review model: pending rows come from `business_applications`, approval calls atomic backend review and creates a business profile, rejection stores a reason. The page did not explain that source/lifecycle, so the feature looked undefined.
- Club events create/update forms persisted `coverImageUrl`, while Supabase already has a public `event-media` bucket and organizer upload policies. The missing web UX was client upload-to-storage before saving the event.
- Club rewards already require `eventId` in the create payload, but the event-to-reward relationship was not prominent enough in the UI.
- Admin shell uses a 282px sidebar grid column, but adding explicit width, max-height, overflow, and `min-width: 0` on content makes the layout less sensitive to wide page content.
- Full FI/EN admin + organizer i18n was not present as a shared web language system. A safe first layer is dashboard-shell level locale resolution via an HTTP-only cookie plus translated nav/title/subtitle maps. The highest-risk pages from the user request (`/admin/business-applications`, `/club/events`, `/club/rewards`) also need panel-level copy props so their core workflows switch language with the shell.

## Business/Admin Workflow Parity Review Outcome

Targeted UX and workflow gaps were fixed safely with minimal code changes. Dashboard FI/EN now has a persistent shell-level foundation and the three requested workflow panels have bilingual core copy. Other admin/organizer panels still contain hard-coded English detail copy and should be migrated incrementally through the same `DashboardLocale` prop/dictionary pattern.

## Current Review (Announcement Delivery + Contact Hosted Follow-up)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Scope:** Hosted contact hardening rollout adimlarini tamamlamak; mobil duyuru popup/detail/realtime gorunurlugunu ve organizer completed-event gorunurlugunu duzeltmek.

## Announcement Delivery + Contact Hosted Affected Files

- `apps/mobile/src/features/announcements/announcements.ts`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/features/announcements/announcement-popup-bridge.tsx`
- `apps/mobile/src/features/announcements/announcement-detail-screen.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `supabase/migrations/20260506001000_announcement_realtime_publication.sql`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Announcement Delivery + Contact Hosted Findings

- Hosted contact migration `20260506000000_public_contact_submissions.sql` localde vardi ama remote history'de uygulanmamis gorunuyordu. Migration SQL'i linked hosted DB'de calisti; RLS policy kontrolu service_role insert/read ve platform admin read/update policy'lerini dogruladi; `contact-attachments` bucket private, 5MB ve jpg/png/webp limitli.
- Vercel production env'de sadece `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vardi. `SUPABASE_SERVICE_ROLE_KEY` ve `CONTACT_IP_HASH_SECRET` eklendi. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` eksik kaldi cunku Cloudflare API MCP `Authentication error` dondu ve lokal Cloudflare token yok.
- `omaleima.fi/contact` 200 donuyor ama HTML'de gercek Turnstile sitekey/widget izi yok. Yeni hardening deploy'u Turnstile key'leri olmadan hosted build/check tarafinda fail-fast edecegi icin production redeploy ve gercek submit smoke bilincli olarak bekletildi.
- Mobilde `AnnouncementPopupBridge` globalde mount ediliyor; fakat popup sadece close/CTA dis link sunuyordu, uygulama ici detay sayfasina giden "daha fazla gor" aksiyonu yoktu.
- Duyuru detay ekraninda gorsel hero olarak gorunuyor ama image tap-to-zoom akisi yoktu.
- Student `Tapahtumat`/Events ekraninda announcement feed render edilmiyordu. Kullanici event sayfasini refresh etse bile duyuruyu orada gormemesi beklenen davranisa donusuyordu.
- Announcement query'leri Supabase Realtime invalidate etmiyordu. Var olan realtime mimarisi stamp/reward/leaderboard icin vardi; announcements icin tablo publication ve query invalidation eksikti.
- Organizer `Tulossa` ekraninda `COMPLETED` eventler bilincli olarak filtre disinda birakilmisti; bu yuzden `Päättynyt` organizasyonlari gorulebilir degildi.

## Announcement Delivery + Contact Hosted Review Outcome

Contact migration ve iki server secret hosted ortamda tamamlandi; gercek Turnstile key'leri gelmeden deploy/smoke tamamlanamaz. Mobil tarafta popup preview -> detail, detail image zoom, events-page announcement feed, announcement realtime invalidation ve organizer completed filter minimal diff ile uygulanacak.

## Current Review (Public Landing Image Sharpness)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree
- **Scope:** `omaleima.fi` public landing ana sayfasindaki bulanik gorunen hero ve "Approkulttuuri elaa" galerisi gorsellerinin kok nedenini bulup duzeltmek.

## Public Landing Image Sharpness Affected Files

- `apps/admin/src/features/public-site/landing-page.tsx`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Public Landing Image Sharpness Findings

- Canli sitede browser inspection sonucunda hero image `697px` CSS genislige karsi `1920w` varyant aliyor; burada ana problem daha cok default `q=75` sikistirma. Hero source boyutu `1672x941`, yani retina desktop icin sinirda ama kabul edilebilir.
- Asil sorun "Approkulttuuri elaa" galerisindeki genis kartlarda. Canli sitede `public-gallery-wide` kartlari yaklasik `887px` CSS genislikte render oluyor ama mevcut `sizes` tum galeri item'lari icin desktop'ta `33vw` diyor. Browser bu yuzden genis kartlar icin yalnizca `1080w` dosya indiriyor ve kartta buyuterek gosterdigi icin blur olusuyor.
- Browser proof: ilk genis galeri item'i `clientWidth: 887` iken `currentSrc ...&w=1080&q=75` olarak geldi. Bu item retina desktop'ta efektif olarak yaklasik `1774px` kaynaga ihtiyac duyuyor.
- Kaynak dosyalarin cogu `1672x941` veya `1774x887`. Yani source asset'ler mukemmel degil ama esas kalite kaybi hatali `sizes` + agresif compression kombinasyonundan geliyor.

## Public Landing Image Sharpness Review Outcome

Hero ve galeri `Image` component'lerinde daha yuksek `quality` kullan, galeri item'lari icin `span` bazli dogru `sizes` degeri ver, hero metadata/olculerini current asset ile hizala ve sonucu local/canli olarak tekrar dogrula.

## Current Review (Contact Form Security + Business Package Follow-up)

- **Date:** 2026-05-05
- **Branch:** `feature/contact-form-hardening`
- **Scope:** Kullanici tarafindan eklenen public contact form ve yeni frontend polish commit'lerini incelemek; gerekiyorsa Cloudflare Turnstile, RLS/storage hardening ve contact submission admin yuzeyi kontrollerini eklemek; business paket anlatimini sonraki adimlarla uyumlu tutmak.

## Contact Form Security Affected Files

- `apps/admin/src/app/api/contact/route.ts`
- `apps/admin/src/features/public-site/contact-form.tsx`
- `apps/admin/src/features/public-site/contact-content.ts`
- `apps/admin/src/features/public-site/contact-page.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/scripts/check-hosted-env.ts`
- `apps/admin/.env.example`
- `supabase/migrations/20260506000000_public_contact_submissions.sql`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Contact Form Security Findings

- Contact route'ta honeypot, elapsed-time check, MIME/magic-byte validation ve basic rate limit vardi; ancak DB migration anonim client'a `public_contact_submissions` insert ve `contact-attachments` storage upload izni veriyordu. Bu, API'deki tum bot/validation/rate-limit kontrollerinin Supabase REST/storage endpoint'leri uzerinden bypass edilebilmesi anlamina geliyordu.
- In-memory rate limiter Vercel/serverless ortaminda instance-local kalir; tek basina yeterli degil. API zaten DB'ye yazdigi icin IP hash uzerinden DB-backed recent/daily limit daha guvenilir.
- Cloudflare Turnstile resmi dokumanina gore client widget tek basina koruma degil; server-side Siteverify zorunlu. Tokenlar 5 dakika gecerlidir ve tek kullanimliktir. Bu yuzden client token'i server'a tasiyip Siteverify sonucuna gore submit edilmeli.
- Contact attachment WebP magic byte kontrolu yalnizca `RIFF` prefix'ine bakiyordu; `WEBP` marker'i da dogrulanmali.
- Hosted deployment artik contact form icin `SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_IP_HASH_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` olmadan fail-fast olmali.

## Contact Form Security Review Outcome

Contact form server-side validation merkezli hale getirildi: public Supabase direct insert/upload kapatildi, API service-role client ile yaziyor, Turnstile Siteverify server'da dogrulaniyor, rate limit DB-backed IP hash sayimina tasindi ve hosted env check gerekli secret'lari zorunlu kiliyor. Bu model reCAPTCHA yerine Cloudflare Turnstile secerek daha az friction ile yeterli bot korumasi saglar.

## Current Review (Business Growth Package + Background Push Readiness)

- **Date:** 2026-05-05
- **Branch:** `feature/business-growth-package`
- **Scope:** Temiz main merge sonrasi web ve mobile yuzeylere Finlandiya appro/haalarit kulturune uygun business-growth paketini eklemek; ogrenci, kulup/organizer ve business tarafinda urunun neden kullanilacagini daha net gostermek; mevcut push altyapisinda arka plan notification delivery icin guvenli minimum ayarlari dogrulamak.

## Business Growth Package Affected Files

- `apps/admin/src/features/public-site/content.ts`
- `apps/admin/src/features/public-site/landing-page.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/public/images/public/scene-event-in-hand.png`
- `apps/mobile/app.config.ts`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/club/home.tsx`
- `supabase/functions/_shared/expoPush.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Business Growth Package Findings

- QR/scan akisi kullanici tarafindan iki iPhone ile dogrulandi; bu turda scanner veya stamp RPC davranisina dokunulmamali.
- Ogrenci ve kulup tarafina yeni ucret bariyeri koymak pilot icin zayif olur. Gelir modeli, business/venue/sponsor tarafinda verified student traffic, reward visibility, offer redemption ve post-event reporting olarak konumlanmali.
- Public landing zaten FI/EN yapiya sahip; yeni model bolumu content source-of-truth'a eklenip nav'dan erisilebilir olmali.
- Mobile'da business/club home ekranlari kullanici rolune gore paket mantigini anlatmak icin en dusuk riskli yerler. Ogrenci tarafinda Events ekranina kisa deger karti eklemek, neden app'i acsinlar sorusunu dogrudan cevaplar.
- Mevcut push altyapisi `expo-notifications`, fiziksel cihaz token registration, backend `device_tokens` ve Expo Push Service payload'lariyla kurulmus. Backend notification message `title` + `body` gonderdigi icin OS arka planda bildirimi gosterebilir; silent/headless JS calistirma bu slice'in kapsami degil.
- Android notification default channel config'i build-time plugin ayariyla netlestirilmeli. Backend push payload'i `priority: high` ve `sound: default` ile gonderilirse event-day notification beklentisi daha tutarli olur.

## Business Growth Package Review Outcome

Yeni paket ucretsiz ogrenci/organizer core + ucretli business/venue/sponsor degeri olarak konumlandi. Web landing, mobile student, mobile club ve mobile business yuzeyleri ayni anlatida hizalandi. Push tarafinda visible remote notifications icin mevcut mimari korunup delivery varsayilanlari guclendirildi; headless background task eklenmedi cunku urun akisi bildirim gostermek istiyor, arka planda JS islemi calistirmak degil.

## Current Review (Manual QR Token Scanner Smoke)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree
- **Scope:** iOS Student QR ekranindan fresh token decode edip hosted scanner context'iyle manuel scan yapmak, test stamp'ini temizleyip gercek `SUCCESS` sonucunu almak, Android scanner UI/auth/camera readiness'i dogrulamak.

## Manual QR Token Scanner Smoke Affected Files

- `apps/mobile/app.config.ts`
- `apps/mobile/android/**` (generated/ignored native smoke project)
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Manual QR Token Scanner Smoke Findings

- Hosted Supabase'te bu test ogrencisi icin `Students Ready Party` / `OmaLeima Bar Tampere` stamp'i zaten vardi; kullanici test data oldugunu onaylayinca yalnizca hedef `stamps.id = 63bf5c17-6c8b-4c5a-a17d-b1f53df0bcc5` kaydi silindi.
- iOS Student QR screenshot'i decode edilerek scanner endpoint'ine verildi. Eski token ile `QR_EXPIRED` dondu; bu kisa omurlu QR/replay korumasinin calistigini dogruladi.
- Fresh iOS QR token ile hosted `scan-qr` endpoint'i scanner auth, business id, `eventVenueId = 41cc8649-7911-4146-b7cf-34cbcc531ddf` ve Android scanner device id ile `SUCCESS` dondu. Yeni stamp id: `3939cf41-49e4-495c-84dd-4702fcb464f5`; `stampCount = 1`; reward unlock push status `NONE`.
- Supabase linked DB query yeni stamp'i `VALID` olarak dogruladi; iOS Student QR ekraninda leima count `1` oldu. Kanitlar: `/tmp/omaleima-ios-students-ready-fresh-success-qr.png`, `/tmp/omaleima-ios-students-ready-after-success-stamp.png`.
- Android emulator'da scanner hesabi UI uzerinden login oldu, password manager prompt'u kapatildi ve Business Scanner ekranina dustu. Deeplink parametresi ile `Students Ready Party` scanner context'i secili hale geldi. Kanit: `/tmp/omaleima-android-business-scanner-students-ready-deeplink.png`.
- Android scanner camera permission blocker'i yakalandi: `expo-image-picker` config'inde `cameraPermission: false` generated Android manifest'te `android.permission.CAMERA tools:node="remove"` uretiyordu ve `expo-camera` scanner'i izin alamiyordu. `apps/mobile/app.config.ts` artik camera permission string'i veriyor; generated manifest smoke icin `android.permission.CAMERA` iceriyor ve Android debug build yeniden kuruldu.

## Manual QR Token Scanner Smoke Review Outcome

Manual-token full-flow smoke hosted ortamda tamamlandi: iOS ogrenci QR -> scanner auth/context -> hosted Edge Function -> atomic stamp -> iOS leima count update zinciri calisti. Reward unlock bu fixture'da tetiklenmedi cunku event/reward threshold sonucu yeni unlock uretmedi. Android'da scanner UI login, selected event context ve camera permission readiness dogrulandi; emulator kamera ile fiziksel QR okutma halen physical-device release gate olarak kalir.

## Current Review (Full-Flow Device Smoke)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree
- **Scope:** iOS Student Google PKCE login handoff'unu baslatmak, kullanici login'i tamamladiktan sonra QR/scan/reward/announcement full-flow smoke'a devam etmek ve Android icin eksik dev-client/native build zeminini olusturup emulator smoke almak.

## Full-Flow Device Smoke Affected Files

- `apps/mobile/android/**` (generated if `expo run:android` prebuilds)
- `apps/mobile/package-lock.json` (possible Expo/Gradle side effects only if tool updates it)
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Full-Flow Device Smoke Findings

- iOS dev-client launch path onceki turda kanitlandi: LAN Metro + `exp+omaleima-mobile` scheme login ekranini yukluyor.
- iOS simulator SecureStore'da hosted business scanner session kalmis olabilir; student PKCE smoke icin once sign-out veya data reset gerekli.
- Kullanici Google credential girisini kendisi tamamlayacak. Bu, credential gizliligi icin dogru; ajan callback sonrasi app state ve PKCE sonucu uzerinden devam edecek.
- Android `Pixel_9` emulator boot edebiliyor fakat app artifact yok. Kullanici bu turda "Android icin de ne gerekiyorsa yap" dedigi icin generated Android native project/dev build artik kapsam icinde.
- Repo dirty durumda ve cok sayida unrelated degisiklik var. Android generated files buyuk bir diff olusturabilir; bu diff smoke zemini olarak raporlanacak, unrelated dosyalar revert edilmeyecek.
- iOS Student Google PKCE handoff kullanici tarafindan tamamlandi. Callback sonrasi app authenticated Student Events ekranina dondu; hosted event context canli/registered eventleri gosterdi.
- iOS student QR uretimi dogrulandi: `Test` event'i icin active leima pass ve dinamik QR ekrani render oldu. Kanit: `/tmp/omaleima-ios-student-qr.png`.
- iOS Rewards yuzeyi dogrulandi: reward trail, leima count ve completed reward card render oldu. Kanit: `/tmp/omaleima-ios-student-rewards.png`.
- iOS Community/announcement yuzeyi dogrulandi: hosted guild announcement listesi, read state ve announcement detail navigation calisti. Kanitlar: `/tmp/omaleima-ios-student-community.png`, `/tmp/omaleima-ios-student-announcement-detail.png`.
- Metro log'unda Student Google akisi sirasinda `WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.` uyarisi goruldu. PKCE code exchange calisti, fakat native runtime'da S256 yerine plain fallback release oncesi guvenlik/compatibility notu olarak takip edilmeli.
- Android `Pixel_9` emulator'a generated native dev-client debug build kuruldu. Gradle 9 wrapper mevcut RN/AGP toolchain ile `JvmVendorSpec IBM_SEMERU` hatasi verdi; wrapper smoke icin Gradle `8.14.3` olarak pinlendi ve local SDK path eklendi.
- Android install sonrasi `fi.omaleima.mobile/.MainActivity` cozuldu, app ayni LAN Metro URL ile acildi ve Student sign-in landing render oldu. Kanit: `/tmp/omaleima-android-student-login-clean.png`.
- Gercek scan zinciri halen fiziksel iki cihaz gate'i olarak kaliyor. Simulator/emulator camera ile iOS QR'ini guvenilir okutacak setup bu turda tamamlanmadi; QR generation + scanner-ready + dynamic scan regression kanitlari birbirinden ayri raporlanmali.

## Full-Flow Device Smoke Review Outcome

iOS Student Google PKCE callback, QR, rewards ve announcement/detail UI smoke tamamlandi. Android emulator'da generated dev-client build/install ve Student sign-in launch smoke tamamlandi. Kalan tek gercek full-flow gate fiziksel iki cihazla camera scan + reward unlock zinciri; bunun icin student QR gosteren cihaz ve scanner camera cihazi ayni hosted event context'inde kullanilmali.

## Current Review (Public Landing Legal Pages + Footer + Visual Balance)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree
- **Scope:** Public landing'de eksik desktop dikey fotograf slotunu doldurmak, story/support alan renk dengesini iyilestirmek, footer'i tam-genislikte gercek bir site footer'ina cevirmek, Finlandiya odakli FI+EN legal sayfalari eklemek ve sonunda production deploy almak.

## Public Landing Legal Pages + Footer + Visual Balance Affected Files

- `apps/admin/src/features/public-site/landing-page.tsx`
- `apps/admin/src/features/public-site/content.ts`
- `apps/admin/src/features/public-site/legal-content.ts` (new)
- `apps/admin/src/features/public-site/legal-page.tsx` (new)
- `apps/admin/src/app/page.tsx`
- `apps/admin/src/app/en/page.tsx`
- `apps/admin/src/app/privacy/page.tsx` (new)
- `apps/admin/src/app/en/privacy/page.tsx` (new)
- `apps/admin/src/app/terms/page.tsx` (new)
- `apps/admin/src/app/en/terms/page.tsx` (new)
- `apps/admin/src/app/globals.css`
- `apps/admin/public/images/public/scene-generated-vertical-checkpoint.png` (new)
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Public Landing Legal Pages + Footer + Visual Balance Findings

- Public landing'in ilk bento galerisinde desktop tarafinda uzun bir dikey slot bos/siyah gorunuyor; kullanici bu alan icin yeni ve tema uyumlu bir fotograf istiyor. Mevcut asset havuzu bu ihtiyaci tam karsilamiyor; yeni bir yazisiz dikey sahne gorseli uretilip repo icine alinmali.
- `storyItems` basliklari ve support/contact karti ayni beyaz agirlikli hiyerarsiyle kaliyor; kullanici ozellikle bu basliklari acik yesil vurguda istiyor. Bu degisiklik content degil sunum katmaninda yapilmali.
- Destek ve CTA alani mevcut koyu/yesil degrade ile biraz bulanik gorunuyor. Daha temiz bir panel tonu ve daha kontrollu doku/opaklik daha uygun.
- Footer su an kutu gibi duruyor; tam-genislikte, soldan saga uzanan ve sirket bilgileri + legal linkler + locale gecisleri olan daha ciddi bir footer gerekiyor.
- Legal footer item'lari placeholder string; artik gercek route'lara donusmeli.
- Resmi kaynak dogrulamasi gerekliydi. KKV sayfasi sirket adi, maantieteellinen osoite, sahkoposta, puhelin, Y-tunnus ve toimivaltainen riidanratkaisuelin bilgisinin gorunur verilmesini anlatiyor. EDPB SME guide ise Art. 13/14 GDPR kapsamindaki bilgilendirmenin katmanli, okunabilir ve tam olmasini oneriyor. Kuluttajariitalautakunta sayfasi da once sirketle ve gerekirse KKV Consumer Advisory ile temas edilmesini, ardindan Board yolunu acikliyor. ODR platformu ise 20 July 2025 itibariyla kaldirildi.

## Public Landing Legal Pages + Footer + Visual Balance Review Outcome

Landing'in mevcut IA'sini koru ama ilk galeriye yeni dikey fotograf ekle, story/support basliklarinda lime vurgu kullan, support/CTA panel arka planlarini daha rafine tona cek, tam-genislikte yeni footer band'i kur ve bilingual `privacy` + `terms` sayfalarini bu projedeki gercek sirket bilgileriyle yayinla.

## Current Review (Dynamic Security Regression + Native Smoke)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree
- **Scope:** Docker + local Supabase stack uzerinde dynamic security regression setini tam kosmak, `student/profile.tsx` native push diagnostics regression'ini frontend redesign ile cakismadan kapatmak, iOS/Android simulator/cihaz smoke kapasitesini MCP/plugin arastirmasiyla netlestirmek.

## Dynamic Security Regression + Native Smoke Affected Files

- `apps/admin/package.json`
- `apps/admin/scripts/smoke-announcement-push.ts`
- `apps/admin/scripts/smoke-qr-security.ts`
- `apps/admin/scripts/smoke-reward-unlocked-push.ts`
- `apps/admin/scripts/smoke-rls-core.ts`
- `apps/admin/scripts/smoke-scan-race.ts`
- `apps/mobile/src/app/student/profile.tsx`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Dynamic Security Regression + Native Smoke Findings

- Docker daemon ve local Supabase stack bu turda ayaga kalkti. `supabase functions serve --env-file supabase/.env.local` ile Edge Function kaynaklari local runtime'dan servis edildi.
- Local DB schema drift vardi: dynamic scan smoke'lari yeni 12 parametreli `scan_stamp_atomic` kontratini bekliyordu, local DB ise eski imzada kalmisti. Gerekli scanner/event-venue migration'lari targeted psql ile local DB'ye uygulandi; `supabase migration up` eski migration parse problemi nedeniyle tum zinciri otomatik ilerletemedi.
- QR/security ve reward smoke harness'leri eski payload varsayimlari tasiyordu. Scanner context artik `eventId` + `eventVenueId` gerektiriyor; scanner device policy ise rastgele string device id'leri reddediyor. Script'ler current Edge Function kontratina hizalandi.
- Auth trigger profil olusturdugu icin RLS/scan fixture profil insert'leri tekrar calismada duplicate profile hatasina dusebiliyordu. Fixture seed'leri `on conflict ... do update` ile idempotent hale getirildi.
- Announcement push icin eksik olan dynamic smoke eklendi. Student kullanicinin push send denemesi 403 ile reddediliyor; admin path mock Expo push server'a beklenen announcement payload'ini gonderiyor ve notification/audit persistence yaziliyor.
- `student/profile.tsx` redesign sirasinda native push diagnostics QA yuzeyi kaldirilmis/eksilmisti. Hook zaten vardi; dev-only diagnostics block tekrar eklendi ve audit'in bekledigi refresh, captured activity clear, last notification source ve APNs/FCM uyarisi geri geldi.
- iOS simulator build/install MCP ile app bundle seviyesine kadar basarili oldu; app `fi.omaleima.mobile` olarak iPhone 17 simulator'e kurulu. Runtime smoke tam flow'a ilerleyemedi: mevcut tunnel URL `exp.direct` simulator'de bundle'a ulasamadi; local localhost denemesinde Metro sadece IPv6 `::1` dinledi, dev client ise once load error sonra `SRWebSocket initWithURLRequest` assertion ile home'a dustu.
- Android tarafinda SDK ve `Pixel_9` AVD var, fakat repo icinde Android native project (`apps/mobile/android`) yok. Emulator baslatma denemesi kalici cihaza donusmedi ve APK/dev-client build olmadigi icin Android app smoke bu turda alinamadi.
- Physical iPhone'lar `devicectl` tarafinda paired/available gorunuyor, fakat `xctrace` offline listeliyor. Tam PKCE/QR/scan/reward/announcement fiziksel smoke icin cihaz trust/developer mode + stable dev-client launch URL gerekiyordu.
- Continuation smoke'ta iOS dev-client launch zemini stabilize edildi: Metro `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.109` ile LAN'dan servis edildi ve app `exp+omaleima-mobile://expo-development-client/?url=http%3A%2F%2F192.168.1.109%3A8082` URL'iyle acildi. App login ekranina bundle ederek geldi.
- Pilot credential dosyasindaki hosted scanner hesabi ile iOS simulator'de business login tamamlandi. Auth destination resolver scanner-only hesabi dogrudan Business Scanner alanina yonlendirdi; alt tablarda sadece Scanner ve History gorundu.
- iOS scanner smoke'ta hosted live event kartlari geldi, iOS camera permission prompt'u dogru usage string ile acildi, izin sonrasi kamera frame ready state'e gecti. Kanit ekranlari: `/tmp/omaleima-ios-scanner-camera-ready.png` ve `/tmp/omaleima-ios-scanner-history.png`.
- iOS History tab'i hosted scan history verisini cekti; valid stamp/student/needs-review ozetleri ve event filtreleri render oldu. Bu, business auth + scanner-only routing + hosted read-model path icin gercek UI smoke kanitidir.
- Android `Pixel_9` emulator headless modda boot etti (`emulator-5554`, `sys.boot_completed=1`, `dev.bootcomplete=1`) ve boot proof `/tmp/omaleima-android-emulator-booted.png` olarak alindi. Ancak cihazda `fi.omaleima.mobile` kurulu degil, workspace'te APK/AAB yok ve `apps/mobile/android` yok. Android app smoke icin EAS/dev-client APK artifact'i ya da onayli `expo run:android`/prebuild dosya uretimi gerekiyor.
- Student PKCE login, QR uretme, scan, reward unlock ve announcement full-flow smoke tamamlanamadi. Sebep kod blocker'i degil: student login Google-only ve testte Google ogrenci credential'i yok; QR/scan/reward zinciri icin en az bir authenticated student device/session ile scanner device/session birlikte gerekiyor.

## Dynamic Security Regression + Native Smoke Review Outcome

Local dynamic security regression seti artik tam geciyor: admin auth, RLS core, QR security, scan race, reward unlock push ve announcement push. Native tarafinda repo-level audit'ler ve iOS install proof'u alindi; tam simulator/physical click-path smoke icin Metro/dev-client URL stabilizasyonu ve Android native build zemini ayrica tamamlanmali.

## Current Review (Public Landing Desktop Footer + Favicon + Unique Media Pass)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Scope:** Public landing desktop'ta kalan son polish sorunlarini kapatmak: bos/siyah galeri slotu, kirik footer desktop yerlesimi, fazla buyuk tipografi, default Vercel favicon ve tekrar eden ayni gorsel kullanimi.

## Public Landing Desktop Footer + Favicon + Unique Media Affected Files

- `apps/admin/src/features/public-site/landing-page.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/src/app/layout.tsx`
- `apps/admin/src/app/favicon.ico`
- `apps/admin/src/app/icon.png`
- `apps/admin/src/app/apple-icon.png`
- `apps/admin/public/images/public/scene-night-qr-walk.png` (new)
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Public Landing Desktop Footer + Favicon + Unique Media Findings

- `globals.css` icinde `@media (max-width: 640px)` blogu kapanmadigi icin footer taban stilleri parser tarafinda bozuluyor; desktop footer'in tek tarafa yigilan kirik gorunumu bununla uyumlu.
- Footer legal item'lari sadece art arda `span` olarak render edildigi icin desktop'ta okunakli kolon/pill ayrimi yok; kullanicinin screenshot'indaki birlesik satir hissi beklenen sonuc.
- Hero ve section basliklari onceki tura gore daha iyi ama desktop'ta hala gereksiz buyuk; sorun copy degil scale.
- `apps/admin/src/app/favicon.ico` ayrica mevcut oldugu icin browser tarafinda explicit metadata icon'larindan once onu gormek normal; bu dosya gercek logo ile degistirilmeden Vercel/default icon hissi kapanmaz.
- Public image havuzunda farkli dosya adlari altinda ayni bitmap tekrar ediyor (`scene-bar-qr-scan` / `gen-scanning-qr` benzeri). Kullanici istegi dosya adindan degil goruntu tekrarindan kacinmak oldugu icin gorsel bazli tekillesme gerekli.
- Alt galerilerde screenshot'ta gorulen siyah yuzeyler sadece tasarim boslugu degil; lazy image request zamanlamasi da buna katkida bulunuyor. Desktop landing kadar gorsel odakli bir sayfada section gorsellerini eager istemek makul.

## Public Landing Desktop Footer + Favicon + Unique Media Review Outcome

CSS syntax kirigini ve footer desktop layout'unu duzelt, landing tipografisini bir kademe geri cek, landing boyunca kullanilan gorselleri gercek bitmap seviyesinde tekillestir, gerekirse generated asset havuzundan yeni benzersiz sahne gorseli kopyala, section image loading'i eager yap ve `favicon.ico` dosyasini dogrudan OmaLeima logosuyla degistir.

## Current Review (Security Regression + Device Smoke Attempt)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree
- **Scope:** Kullanici istegiyle auth, scanner, RLS, reward/announcement push regression kontrollerini yeniden kosmak ve mumkun olan native smoke/dogrulama adimlarini plugin/MCP yardimiyla gerceklemek.

## Security Regression + Device Smoke Affected Files

- `apps/admin/scripts/smoke-auth.ts`
- `apps/admin/scripts/smoke-password-session-origin-guard.ts`
- `apps/admin/src/app/auth/password-session/route.ts`
- `apps/admin/src/features/auth/password-session-guard.ts`
- `apps/mobile/scripts/audit-native-simulator-smoke.mjs`
- `apps/mobile/scripts/audit-native-push-device-readiness.mjs`
- `apps/mobile/scripts/audit-reward-notification-bridge.mjs`
- `apps/mobile/scripts/audit-hosted-business-scan-readiness.mjs`
- `apps/mobile/scripts/audit-realtime-readiness.mjs`
- `apps/mobile/src/lib/auth.ts`
- `apps/mobile/src/lib/supabase.ts`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/qr/student-qr.ts`
- `apps/mobile/src/features/realtime/student-realtime.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Security Regression + Device Smoke Findings

- Local Supabase stack bu turda ayakta degil. `docker ps` daemon baglanamadi ve `127.0.0.1:54321` auth endpoint'i `000` dondu. Bu nedenle `smoke-auth`, `smoke-rls-core`, `smoke-qr-security`, `smoke-scan-race` ve `smoke-reward-unlocked-push` gibi seeded local stack isteyen dinamik regression script'leri runtime olarak tamamlanamadi.
- Admin web auth hardening regression'i focused smoke ile hala saglam. `smoke-password-session-origin-guard.ts` ayni route guard mantigini kosup `password-session-origin-guard:OK` dondu.
- Mobile auth tarafinda kod izi hala beklenen sertlestirmeyi koruyor: `apps/mobile/src/lib/supabase.ts` PKCE akisini kullaniyor, `apps/mobile/src/lib/auth.ts` ise deep link icindeki raw `access_token` / `refresh_token` degerlerini reddedip yalnizca `exchangeCodeForSession(code)` yolunu kabul ediyor.
- Mobile reward notification bridge audit'i gecti; provider seviyesi local foreground reward notification wiring'i korunmus gorunuyor.
- `audit-native-push-device-readiness.mjs` fail verdi ve bu fail stale script'ten degil, `apps/mobile/src/app/student/profile.tsx` icinde push diagnostics yuzeyinde audit'in aradigi kontrol/label setinin artik bulunmadigini gosteriyor. Bu, fiziksel push smoke oncesi dogrulanmasi gereken gercek bir regression adayi.
- `audit-hosted-business-scan-readiness.mjs` fail verdi cunku manual token fallback marker'larini ariyor. Bu failure tek basina yeni bir regression kaniti degil; onceki scanner kiosk simplification slice'inda manual fallback bilerek kaldirilmisti.
- `audit-realtime-readiness.mjs` fail verdi cunku stamp progress query'sinin "snapshot-only" seklini bekliyor. Mevcut kod ise daha yeni hybrid polling + realtime invalidation akisini tasiyor; bu da audit'in eski varsayimla stale kaldigini gosteriyor.
- iOS simulator tarafinda `xcodebuildmcp` ile workspace/scheme/simulator kesfedildi, simulator boot edildi ve `build_run_sim` denendi. MCP cagrisi 120 saniyede timeout verdi ama arkada `xcodebuild` compile etmeye devam etti; elde launch/screenshot seviyesinde basarili app proof'u henuz yok.

## Security Regression + Device Smoke Review Outcome

Bu turda elde edilen en guclu kanit seti su sekilde: admin web session guard smoke gecti, mobile auth hardening kod seviyesinde korunuyor, reward notification bridge wiring'i korunuyor, local dynamic regression ise stack offline oldugu icin acik proof gap olarak kaldi. Mobile native push diagnostics yuzeyi icin ise gercek regression adayi ortaya cikti; frontend sahibi ajanla cakismadan ayri bir slice'ta netlestirilmesi gerekiyor.

## Current Review (Repository Security Scan + Auth Session Hardening)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree
- **Scope:** Repository-wide security scan focused on real runtime trust boundaries: Supabase auth/session handling, admin web session bootstrap, mobile OAuth callback handling, Edge Functions, and RLS-backed mutation surfaces.

## Repository Security Scan Affected Files

- `apps/admin/src/app/auth/password-session/route.ts`
- `apps/mobile/src/lib/supabase.ts`
- `apps/mobile/src/lib/auth.ts`
- `apps/mobile/src/features/auth/components/google-sign-in-button.tsx` (read-only validation context)
- `apps/mobile/src/app/auth/callback.tsx` (read-only validation context)
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Repository Security Scan Findings

- The web admin password sign-in flow first calls `supabase.auth.signInWithPassword()` in the browser, then posts the returned `accessToken` and `refreshToken` to `POST /auth/password-session`, where the route blindly calls `supabase.auth.setSession()` and writes cookies. The route currently has no same-origin verification, no CSRF token, and no fetch-metadata/origin guard. A malicious site that controls a valid token pair for its own account can submit a cross-site POST and force the victim browser onto the attacker's operator session.
- The mobile Supabase client keeps the default auth flow type (`implicit`). In `apps/mobile/src/lib/auth.ts`, the native OAuth callback accepts `access_token` and `refresh_token` directly from the returned deep link and persists them with `supabase.auth.setSession()`. Because the custom scheme callback can be invoked outside the in-progress Google sign-in flow, an attacker who can make the device open `omaleima://auth/callback?...` with their own tokens can session-fix the app into the attacker's account.
- The rest of the first-pass scan found strong existing controls in the highest-risk product paths: `register_event_atomic` enforces public-event-only self-registration, `scan-qr` binds scanner business membership plus selected event venue context before the atomic RPC call, and announcement CRUD is constrained by RLS. Those areas still need runtime validation, but they did not yield a stronger reportable finding than the two auth session issues above.

## Repository Security Scan Review Outcome

Harden both session bootstrap surfaces at the trust boundary itself: reject cross-site web session bootstrap requests before `setSession()`, and migrate mobile Google OAuth to a PKCE code-only flow that never trusts raw deep-link bearer tokens. Then run admin/mobile validation plus focused smoke coverage for the two fixed paths.

## Current Review (Public Landing Desktop Gallery Refresh + Navbar Behavior)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Scope:** Keep the new fixed/mobile-navbar behavior, but roll back the too-small desktop image treatment and rebuild the public photo surfaces with stronger Desktop generated assets and a fuller gallery composition.

## Public Landing Desktop Gallery Refresh + Navbar Affected Files

- `apps/admin/src/features/public-site/landing-page.tsx`
- `apps/admin/src/features/public-site/public-navbar.tsx` (new)
- `apps/admin/src/features/public-site/content.ts`
- `apps/admin/src/app/globals.css`
- `apps/admin/public/images/public/*` (selected refreshed photo assets)
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Public Landing Desktop Gallery Refresh + Navbar Findings

- The previous cover-based desktop treatment felt better in scale and energy than the latest contain-based pass, even though the contain pass did fix clipping.
- The current problem is therefore not "show the entire bitmap at all costs"; it is "keep the imagery large and immersive without awkward half-crops or tiny poster-like framing."
- The app-mockup/logo-heavy generated assets are weaker than the Desktop scene-photo set for this landing. The user explicitly prefers the Desktop generated assets and does not want the logo/mockup emphasis.
- The strongest Desktop assets for this purpose are the scene-photo style images: students in haalarit, QR scan moments, reward handoff, and organizer operations. These can support a richer gallery and better cover-style crops than the more graphic square mockups.
- The navbar is already sticky in structure, but it does not behave like a persistent floating nav across the whole scroll experience. The user explicitly wants a fixed presence while scrolling.
- Mobile navigation currently keeps all links visible inline. The requested behavior is a hamburger icon that toggles the menu open/closed instead of always showing the link row.
- The existing landing is server-rendered. A clean mobile menu interaction should be isolated in a small client navbar component rather than converting the entire landing page surface to client mode.

## Public Landing Desktop Gallery Refresh + Navbar Review Outcome

Keep the new client navbar interaction, restore a larger cover-led desktop image system, replace weaker app-mockup/logo assets with selected Desktop generated scene photos copied into the public workspace, and reshape the gallery/app section so the landing feels photographic and full again without the old awkward crops.

## Current Review (Business Media + Scanner Kiosk Audit)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Scope:** Continue the active post-landing goal: verify business/club media upload-render reliability, scanner-only business boundaries, iOS native permission/module state, and simplify the scanner surface by removing the unusable manual token fallback.

## Business Media + Scanner Affected Files

- `apps/mobile/src/features/media/storage-upload.ts`
- `apps/mobile/src/features/media/remote-image-health.ts`
- `apps/mobile/src/features/business/business-media.ts`
- `apps/mobile/src/features/club/club-media.ts`
- `apps/mobile/src/features/club/club-event-media.ts`
- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/app.config.ts`
- `apps/mobile/ios/OmaLeima/Info.plist`
- `apps/mobile/ios/Podfile.lock`
- `supabase/migrations/20260504094444_prune_zero_byte_media_references.sql`

## Business Media + Scanner Findings

- The reported event cover URL under `event-media/.../cover-1777815139854.jpg` returns HTTP 200 with `content-length: 0`, so the mobile warning is caused by a genuinely empty hosted storage object.
- Hosted SQL check did not find live `events.cover_image_url` or `clubs.cover_image_url/logo_url` rows still pointing to that zero-byte object, so any repeated warning on device is likely stale app/query cache, an older build, or a separate row not covered by the first check.
- The upload helpers now read non-empty image bodies and verify public URLs before profile/event rows are updated. That is the right root guard; remaining black image reports need focused hosted data/cache validation rather than a blind UI fallback.
- `apps/mobile/app.config.ts`, native `Info.plist`, and `Podfile.lock` already include camera usage text, location usage text, `ExpoCamera`, and `ExpoLocation`. The physical-device `NSCameraUsageDescription` / `ExpoLocation` crash therefore points to an old installed native build and requires reinstalling a fresh dev build, not a JS-only reload.
- Scanner-only business accounts are already redirected to `/business/scanner` or `/business/history` only, and event join/leave controls are hidden for `SCANNER` role.
- `business/scanner.tsx` still includes a manual token paste fallback, which does not match the intended event-day scanner kiosk flow and should be removed.

## Business Media + Scanner Review Outcome

Keep the existing media upload architecture, document the stale zero-byte hosted object evidence, remove the obsolete manual token fallback, and validate that the remaining scanner/native issues are handled through fresh native install and hosted data cleanup rather than extra client-side fallbacks.

## Current Review (App Store Screenshot Pack)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Scope:** Create App Store-ready marketing screenshots for both iPhone and iPad using the OmaLeima visual language and current Apple-accepted screenshot slots.

## App Store Screenshot Pack Affected Files

- `apps/admin/public/images/appstore-screenshots/iphone/*`
- `apps/admin/public/images/appstore-screenshots/ipad/*`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## App Store Screenshot Pack Findings

- The user explicitly wants fresh App Store dimensions, so the accepted screenshot sizes must be checked against current Apple guidance before export.
- The generated OmaLeima marketing visuals already exist in the local Codex generated-images workspace and can be reused as source artwork.
- For a first export pack, one accepted portrait size per device family is enough: `1320x2868` for iPhone 6.9" and `2064x2752` for iPad 13".
- The screenshots need to stay Finnish-first, premium, dark-theme, and close to the existing lime OmaLeima brand language.

## App Store Screenshot Pack Review Outcome

Use the ten freshly generated marketing screenshots as source images, resize them into exact App Store portrait export dimensions for iPhone and iPad, save them under stable workspace paths, and verify pixel dimensions after export.

## Current Review (Hosted Scan RPC Signature Hotfix)

- **Date:** 2026-05-05
- **Branch:** `main` working tree, no branch switch by this agent.
- **Scope:** Scanner tarafinda dogru etkinlik secili olsa bile `scan-qr` Edge Function'in `scan_stamp_atomic` RPC'sini bulamamasina neden olan hosted Supabase schema drift'ini kapatmak.

## Hosted Scan RPC Hotfix Affected Files

- `supabase/migrations/20260505143000_scan_stamp_event_venue_rpc_hotfix.sql` (new)
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Hosted Scan RPC Hotfix Findings

- Mobil ekrandaki hata artik onceki Hermes `DOMException` client hatasi degil; Supabase response body `PGRST202` donduruyor: `Could not find the function public.scan_stamp_atomic(... p_event_venue_id ... p_scanner_pin ...) in the schema cache`.
- Local `supabase/functions/scan-qr/index.ts` 12 named RPC argument gonderiyor: `p_event_id`, `p_student_id`, `p_qr_jti`, `p_business_id`, `p_event_venue_id`, `p_scanner_user_id`, `p_scanner_device_id`, `p_scanner_pin`, `p_scanner_latitude`, `p_scanner_longitude`, `p_ip`, `p_user_agent`.
- Hosted Supabase MCP sorgusu canli DB'de yalnizca 10 ve 11 parametreli eski `scan_stamp_atomic` overload'lari oldugunu dogruladi; 12 parametreli selected `event_venue_id` kontrati canli DB'ye uygulanmamis.
- Hosted migration history `20260503150000` ve `20260503170000` migration'larini gosteriyor, fakat selected event venue migration'i (`20260504123000`) canli history'de yok. Edge Function yeni, DB eski kaldigi icin iki taraf dogru event secse de RPC imzasi bulunmuyor.
- PostgREST docs `PGRST202` stale/missing function signature sorunlari icin schema cache reload gerektigini soyluyor; migration sonunda `notify pgrst, 'reload schema'` gonderilmeli.

## Hosted Scan RPC Hotfix Review Outcome

Yeni idempotent migration, eski 10/11 parametreli `scan_stamp_atomic` overload'larini temizleyip 12 parametreli selected event venue aware function'i kuracak, execute grant'ini yalnizca `service_role` icin acacak ve PostgREST schema cache reload notify'i gonderecek. Ardindan Supabase MCP ile hosted function signature tekrar dogrulanacak.

## Current Review (Admin + Organizer Web Panel Design Overhaul — Phase 1)

- **Date:** 2026-05-05
- **Branch:** `main` working tree, no branch switch by this agent.
- **Scope:** Yapisal redesign of `apps/admin` admin and organizer (club) panel pages. Renkler degil, layout/composition/component disiplini hedef. Bu slice Phase 1: shell + sidebar + dashboard home pages.

## Web Panel Design Phase 1 Affected Files

- `apps/admin/src/features/dashboard/types.ts`
- `apps/admin/src/features/dashboard/sections.ts`
- `apps/admin/src/features/dashboard/components/dashboard-shell.tsx`
- `apps/admin/src/features/dashboard/components/dashboard-shortcuts-grid.tsx` (new)
- `apps/admin/src/features/dashboard/components/page-header.tsx` (new)
- `apps/admin/src/features/dashboard/components/nav-icon.tsx` (new)
- `apps/admin/src/app/admin/page.tsx`
- `apps/admin/src/app/club/page.tsx`
- `apps/admin/src/app/globals.css`
- `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`

## Web Panel Design Phase 1 Findings

- `/admin` ve `/club` home pages bugun yalnizca string bullet listesi olan `DashboardSectionsGrid` rendiyor. `Platform oversight`, `Department tags`, `Events` gibi item'lar tiklanabilir degil; sidebar nav'in textual kopyasi gibi duruyor. Hicbir live count veya gercek aksiyon yok.
- Sidebar nav (`DashboardShell`) icon'suz `nav-link` listesi. `Access policy -> /forbidden` item'i UX olarak yanlis; gercek bir nav hedefi degil.
- Her panel page `hero-banner` ile ayni `omaleima-club-control.png` arka planli yuksek panel rendiyor. Yatayda mantikli ama dikeyde her sayfada ayni gorsel; sayfa basligi/altbilgi disinda fonksiyonu yok ve veri-yogun sayfalarda yer kaybettiriyor.
- Mevcut feature panellerinin hicbiri ortak `PageHeader` veya `MetricsCard` primitivi paylasmiyor; her panel kendi `eyebrow + section-title + muted-text` ve `metrics-grid` JSX'ini elle yaziyor. Bu Phase 1 sonrasi Phase 2'de DataList/Pagination ile birlikte ele alinacak.
- Pagination yalnizca `business-applications` panelinde inline kurulmus; oversight, claims, fraud, rewards, tags, announcements pagination'siz.
- Sidebar `position: sticky` 282px sabit grid kolonu olarak duruyor; dar viewport (tablet/mobil) icin responsive davranis yok. `shell` 282px + 1fr grid'i 768px alti ekranda iki kolon olarak sikisiyor.

## Web Panel Design Phase 1 Review Outcome

Bu turda dashboard shell ve home pages disiplinli hale getirilecek: nav iconlari, daha sade `PageHeader`, actionable shortcut cards (icon + title + aciklama + count badge + Link), live count'lar ve dar viewport icin sidebar collapse. Liste/form primitivleri ve diger panel sayfalarinin yenilenmesi Phase 2+'a birakilacak ve ayni REVIEW/PLAN/TODOS disiplini ile devam ettirilecek.

## Current Review (Finnish Club Sales Presentation)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Scope:** Create a premium Finnish-language presentation deck for meeting student clubs and explaining why OmaLeima is useful for appro, pub crawl, and other student event operations.

## Current Review (Partner Presentation V2)

- **Date:** 2026-05-06
- **Branch:** `feature/club-presentation-fi`
- **Scope:** Rebuild the presentation as a more luxurious, photo-led deck for both event organizers and participating businesses/venues, using the user's Desktop generated images.

## Partner Presentation V2 Findings

- The first PPTX was structurally useful but too text-led and too organizer-only for the user's intended audience.
- Desktop generated images `Generated image 1.png` through `Generated image 7.png`, plus `Generated image 9.png`, `Generated image 10.png`, and `Generated image 11.png`, provide stronger visual storytelling than the initial public-site-only asset set. `Generated image 8.png` was not present on Desktop.
- The copy needs to avoid generic startup phrasing and machine-translated Finnish. The revised deck should use shorter, more spoken but still professional Finnish.
- The two buyer contexts are different: organizers care about paper-pass operations, live overview, reward handoff, and event reliability; businesses care about fast scanning, clear staff flow, student visibility, and partner value.

## Partner Presentation V2 Review Outcome

Create a new 15-slide photo-led partner deck, keep text editable, embed the selected Desktop images as persistent presentation assets, and position OmaLeima for both event organizers and businesses.

## Club Presentation Affected Files

- `docs/presentations/omaleima-club-presentation-fi.pptx`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Club Presentation Findings

- `LEIMA_APP_MASTER_PLAN.md` positions OmaLeima as digital infrastructure for Finnish student event culture, not a generic QR app.
- `docs/FINNISH_APPRO_PRODUCT_NOTES.md` confirms the club-facing language should stay close to appropassi, leimat, haalarimerkit, checkpoints, and reward/degree flows.
- The existing public imagery under `apps/admin/public/images/public/` and logo assets are strong enough to build a black/lime premium deck without generating new images.
- The deck should sell operational confidence: less paper handling, faster event-day scanning, live overview, safer anti-duplicate QR flow, and simpler reward handoff.

## Club Presentation Review Outcome

Build a 12-slide widescreen PPTX with concise Finnish copy, a luxury dark/lime visual system, embedded OmaLeima imagery, and presenter-friendly structure for club meetings.

## Current Review (Public Landing v4 Overflow + Icons)

- **Date:** 2026-05-05
- **Branch:** `feature/app-logo-assets`
- **Scope:** Fix the public landing stat-card overflow reported from the live Finnish page, reduce oversized type, remove the brand subtitle language text, add SVG icons to contact/social actions, reuse the already generated haalarit/student imagery, and make navbar anchors scroll smoothly.

## Public Landing v4 Affected Files

- `apps/admin/src/features/public-site/content.ts`
- `apps/admin/src/features/public-site/landing-page.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/public/images/public/omaleima-student-reward.png`
- `apps/admin/public/images/public/omaleima-venue-scan.png`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Public Landing v4 Findings

- The third Finnish stat card uses `Leimaohjattu` as a large value. At the current desktop card width and `clamp(22px, 3vw, 34px)`, that single long Finnish word can overflow its card.
- The navbar brand still renders `Suomi/English` under `OmaLeima`, which the user explicitly wants removed.
- CTA and footer contact/social links are text-only even though these are natural places for simple SVG icons.
- The current generated images are usable, but the landing can better reuse the previously generated haalarit/student reward and scan photos instead of relying only on abstract/operational imagery.
- Anchor nav works but does not yet opt into smooth scroll.

## Public Landing v4 Review Outcome

Keep the landing structure, but tighten the public type scale, rewrite stat values to be short, add robust wrapping constraints, remove the brand subtitle, add inline SVG icons for mail/social links, swap in the student reward and venue scan imagery, and enable smooth anchor scrolling with reduced-motion respect.

## Current Review (Mobile Role Audit + Leaderboard Visibility + Notification Polish)

- **Date:** 2026-05-05
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Verify mobile role surfaces against product intent, fix the student leaderboard event-visibility gap, correct organizer home summary math, and clean the student notification settings surface.

## Role Audit Affected Files

- `apps/mobile/src/features/leaderboard/student-leaderboard.ts`
- `apps/mobile/src/features/leaderboard/types.ts`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/features/events/student-events.ts`
- `apps/mobile/src/features/club/club-dashboard.ts`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/push/device-registration.ts`
- `apps/mobile/src/lib/push.ts`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/components/app-icon.tsx`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Role Audit Findings

- `student-leaderboard.ts` only loads public leaderboard events from the student's own `REGISTERED` rows. This hard-codes the current product gap the user reported: a student cannot browse another public live leaderboard unless they are already registered for that event.
- `student-events.ts` previously fetched only public events, which meant already-registered private or unlisted events could disappear from the student's event list even though the same student still had an active registration.
- `club-dashboard.ts` computes summary cards by reducing across every fetched event, including completed ones. That inflates the organizer home `participants`, `venues`, and `stamps` numbers beyond the currently active event-day window.
- `student/profile.tsx` prints raw push-registration details from `device-registration.ts` and `lib/push.ts`. Those helper messages are English, so the Finnish notification area leaks English strings.
- The same notification area always keeps the `Ota ilmoitukset kayttoon` CTA visible, even after notification setup succeeds. This is noisy once the device is already ready.
- `QA-tyokalut` is already hidden behind `__DEV__`, so it does not leak into production builds, but the row still should not live on the end-user settings screen in developer builds either.
- `announcement-feed-section.tsx` still exposes announcement impression counts as user-facing metadata. That is internal analytics, not product copy.

## Role Audit Risks

- Broadening leaderboard discovery must not remove the student's own event context. Registered events should remain first-class even when public browsing is allowed.
- Hiding the notification CTA must not strand a device in a partially configured state if backend token registration fails after permission is granted.
- Organizer summary math should exclude completed events without breaking the event cards themselves; the list below the summary still intentionally includes draft/upcoming/live contexts.
- Removing QA tools from profile must not break the shared diagnostics provider used elsewhere during development.

## Role Audit Review Outcome

Open the leaderboard overview to public leaderboard events while preserving registered context, align the student event list with the same registration-aware visibility rule, filter organizer summary totals to live/upcoming events only, localize and simplify the student notification settings state, remove the end-user QA row, and strip announcement impression counts from the shared announcement card header.

## Current Review (Public Landing v3 Navbar + Softer Hero)

- **Date:** 2026-05-05
- **Branch:** `feature/app-logo-assets`
- **Scope:** Fix the public landing visual hierarchy after the first live review: Finnish hero text must not overflow image areas, the page should use more horizontal space, and the public website needs a real navbar/footer foundation for later legal pages.

## Public Landing v3 Affected Files

- `apps/admin/src/features/public-site/content.ts`
- `apps/admin/src/features/public-site/landing-page.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/public/images/public/omaleima-night-flow.png`
- `apps/admin/public/images/public/omaleima-scanner-closeup.png`
- `apps/admin/public/images/public/omaleima-backstage.png`
- `apps/admin/public/images/public/omaleima-lime-lines.png`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Public Landing v3 Findings

- The v2 hero placed a very long Finnish headline next to a tall image with an oversized `clamp(46px, 7vw, 88px)` scale. On wide desktop this made the copy feel cramped and visually collide with the media column.
- The root public wrapper was still capped at `1180px`, leaving too much unused side space on modern displays.
- Language switch existed, but there was no real nav structure. This made the page feel more like a temporary splash than a website that can later host legal/support pages.
- Footer was missing, so contact, social, and future legal page affordances had no permanent home.
- Generated raster images with embedded text are risky for bilingual SEO and responsive layout. The safer route is no-text imagery plus HTML text.

## Public Landing v3 Risks

- Do not add broken legal links before the legal pages exist.
- Do not make the public navbar expose private admin routes again.
- Keep generated images local and no-text where possible so Finnish/English copy remains controlled by HTML.
- Keep the page static and light; avoid client JS for this polish pass.

## Public Landing v3 Review Outcome

Use a wider static layout, separate navbar from the hero section, shorten/balance hero copy, add anchor navigation, move contact/social/legal-prep into a footer, and replace the hero/support images with local black-lime generated assets that do not carry required copy inside the bitmap.

## Current Review (Bilingual Public Landing v2 + Imagegen)

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets`
- **Scope:** Remove the public `Open admin panel` CTA, turn the apex site into a more credible bilingual landing page, and use freshly generated raster imagery that matches the OmaLeima black/lime event identity.

## Bilingual Landing Affected Files

- `apps/admin/src/app/page.tsx`
- `apps/admin/src/app/en/page.tsx`
- `apps/admin/src/app/layout.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/src/features/public-site/*`
- `apps/admin/public/images/public/omaleima-hero.png`
- `apps/admin/public/images/public/omaleima-scan.png`
- `apps/admin/public/images/public/omaleima-reward.png`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Bilingual Landing Existing Logic Checked

- The current root page is intentionally minimal and still exposes a direct `Open admin panel` CTA, which is not right for the public face of the brand.
- The site already has a canonical public host and static metadata routes, so a richer landing can remain static and fast.
- There is no public bilingual routing yet. Adding a route-level English page is cleaner for SEO than a client-only toggle because both Finnish and English content become linkable.
- Fresh raster images generated for this turn fit the current black/lime palette and are better suited for hero/editorial use than the previous operations placeholder image alone.

## Bilingual Landing Risks

- Do not accidentally weaken the admin/auth boundary while removing the admin CTA from the public landing.
- Keep the landing mostly static and server-rendered; avoid adding heavy client-side animation libraries for a page that should stay fast.
- Reuse the established font/color language enough that the temporary landing still feels connected to the product while staying visually stronger than the previous placeholder.
- Route-based language support must not break current canonical or sitemap behavior.

## Bilingual Landing Review Outcome

Introduce a small shared public-site module that renders Finnish and English variants from typed content. Use generated editorial images for the hero and feature sections, switch the root page to Finnish, add `/en` for English, update metadata/alternates accordingly, and replace the direct admin CTA with contact/interest actions only.

## Current Review (Public Landing + Web Logo + SEO)

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets` dirty working tree; keep changes scoped to the admin web/public domain surface.
- **Scope:** Put the mobile store logo into the web/admin brand surfaces, make the apex `omaleima.fi` route a minimal public landing surface, and add SEO foundation files before the fuller marketing redesign starts.

## Public Landing / SEO Affected Files

- `apps/admin/src/app/layout.tsx`
- `apps/admin/src/app/page.tsx`
- `apps/admin/src/app/globals.css`
- `apps/admin/src/app/robots.ts`
- `apps/admin/src/app/sitemap.ts`
- `apps/admin/src/app/manifest.ts`
- `apps/admin/src/features/auth/components/admin-login-panel.tsx`
- `apps/admin/src/features/dashboard/components/dashboard-shell.tsx`
- `apps/admin/public/images/omaleima-logo.png`
- `apps/admin/public/images/omaleima-logo-512.png`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Public Landing / SEO Existing Logic Checked

- `apps/admin/src/app/page.tsx` currently redirects every root visit through role access. That is correct for admin-only hosting, but the purchased apex domain needs a public root page that can be indexed and linked from social profiles.
- `apps/admin/src/app/layout.tsx` only has basic `OmaLeima Admin` metadata. It does not define canonical URLs, Open Graph, Twitter metadata, manifest, icons, or robots/sitemap routes.
- Login and dashboard brand lockups still render a text `OL` badge even though the mobile app icon/store icon has already been generated.
- `admin.omaleima.fi` is already the Supabase Auth Site URL and should remain the admin/auth host. The apex `omaleima.fi` should be the public entry point and link users to `https://admin.omaleima.fi/login` when they need the panel.

## Public Landing / SEO Risks

- Do not change Supabase Auth Site URL away from `https://admin.omaleima.fi`; student/admin login redirect behavior depends on it.
- The landing page should stay intentionally lean because the user plans a full public-site redesign next.
- Robots should allow the public root but keep admin/auth/application routes out of search results.
- DNS for the apex still requires the Zone.fi A record to point at Vercel; this repo can prepare Vercel/app code but cannot change the registrar panel.

## Public Landing / SEO Review Outcome

Use the mobile app icon as the shared web logo asset, replace visible text-only brand marks, convert `/` into a minimal public landing page with contact/social/admin links, and add Next.js metadata plus `robots`, `sitemap`, and `manifest` routes. Configure Vercel aliases for `omaleima.fi` and `www.omaleima.fi`, then give the user the exact Zone.fi DNS record needed for the apex.

## Current Review (Business History Filters + Leaderboard Spotlight + Typography Audit)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Rework the business history surface so the card structure is actually useful, add date/event filters plus scan statistics, upgrade the student leaderboard `Sinun tilanteesi` spotlight with a theme-safe gradient treatment, and audit typography usage across the project before closing this work wave.

## History / Typography Affected Files

- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/features/business/business-history.ts`
- `apps/mobile/src/features/business/types.ts`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/features/leaderboard/components/leaderboard-entry-card.tsx`
- `apps/mobile/src/features/foundation/theme.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Existing Logic Checked

- `business/history.tsx` currently renders a single `InfoCard` with the latest scan rows only. There is no date filter, no event filter, no grouped chronology, and no operator-facing summary such as total valid stamps, unique students, or review backlog.
- `business-history.ts` currently fetches only the last 20 `stamps` rows owned by `scanner_user_id`, which is enough for a simple list but too shallow for a useful history surface.
- The data needed for the requested UX already exists in the mobile query result: `eventId`, `eventName`, `studentId`, `scannedAt`, and `validationStatus` are sufficient for client-side filters and summary stats. No migration or new RPC is required for this slice.
- `Sinun tilanteesi` lives in `student/leaderboard.tsx` and uses `LeaderboardEntryCard` from `features/leaderboard/components/leaderboard-entry-card.tsx`. Today the current-user emphasis is a flat lime card, so the section can be upgraded locally without changing the full leaderboard architecture.
- Central mobile typography tokens already exist in `theme.ts` and most visible mobile surfaces use them. A workspace grep shows only a limited set of hardcoded numeric `fontSize` values, concentrated in special-purpose badges, scores, auth inputs, scanner overlays, and a few legacy cards rather than a project-wide token failure.
- Initial grep over `apps/admin/src` did not surface obvious hardcoded numeric `fontSize` style blocks, which suggests the immediate typography consistency risk is concentrated on mobile, not admin.

## Risks

- History filtering should not become fake analytics: labels must clearly distinguish valid, review, and revoked rows.
- Expanding the history fetch limit should stay moderate so the screen remains fast on mobile; this is still a recent-history view, not an infinite archive.
- The leaderboard gradient must stay inside existing theme colors and preserve text contrast in both light and dark modes.
- Typography audit should avoid broad refactors; only obvious visible inconsistencies in this slice should be changed, while the rest should be documented as already token-aligned.

## Review Outcome

Upgrade the business history query to a larger recent window, then rebuild `business/history.tsx` around summary stats, date/event filter chips, and date-grouped scan cards. Apply a theme-safe gradient spotlight to the `Sinun tilanteesi` block by styling the local section and current-user card rather than redesigning the whole leaderboard. Treat typography as an audit-first task: use the existing token scale as source of truth and only correct visible local inconsistencies if the audit reveals them.

## Current Review (Custom Domain Cutover)

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets` dirty working tree; domain work is operational and must not revert unrelated mobile/admin changes.
- **Scope:** Connect the purchased `omaleima.fi` domain to the hosted admin flow safely, keeping hosted Supabase Auth on the preview URL until Vercel DNS verification is green.

## Custom Domain Findings

- Vercel CLI is authenticated under `senol-dogans-projects`, and `apps/admin/.vercel/project.json` is linked to project `omaleima-admin`.
- Vercel already has `admin.omaleima.fi` assigned as an alias for the production admin deployment, so adding it again returns `alias_conflict`.
- `admin.omaleima.fi` has no public DNS A or CNAME result yet.
- Vercel's required DNS record for the current setup is `A admin.omaleima.fi 76.76.21.21`.
- Hosted Supabase Auth is still in preview-site-url mode, Google OAuth is enabled, and the required `https://admin.omaleima.fi/auth/callback` redirect URL is already present.
- The Supabase apply command correctly refuses to switch `site_url` to `https://admin.omaleima.fi` until the custom-domain audit reports `READY`.
- The apex `omaleima.fi` currently serves Zone.fi hosting (`185.31.240.59`) and should remain separate from admin cutover unless a public landing app is intentionally moved to Vercel later.

## Custom Domain Risks

- Switching Supabase Auth before DNS verification would break hosted web auth redirects.
- Changing apex DNS now could disturb future landing-site planning and current Zone.fi hosting/mail setup.
- Zone.fi DNS cannot be changed from this repo/CLI session; the user must add the `admin` record in the registrar DNS panel.

## Current Review (Scanner Sign-Out + Hosted Event Context Enforcement)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Add a top-right sign-out icon to the scanner screen and close the critical hosted bug where mismatched student/scanner event selection can still record a stamp.

## Scanner Enforcement Affected Files

- `apps/mobile/src/app/business/scanner.tsx`
- `supabase/functions/scan-qr/index.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/env.ts`
- `supabase/functions/_shared/expoPush.ts`
- `supabase/functions/_shared/supabase.ts`
- `supabase/functions/_shared/qrJwt.ts`
- `supabase/functions/_shared/validation.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Scanner Enforcement Existing Logic Checked

- Local `business/scanner.tsx` already sends `eventId` and `eventVenueId` with each scan request.
- Local `supabase/functions/scan-qr/index.ts` already rejects `EVENT_CONTEXT_REQUIRED` and `EVENT_CONTEXT_MISMATCH`, and validates the selected joined `event_venues` row before the RPC call.
- Hosted Supabase project `jwhdlcnfhrwdxptmoret` is running an older `scan-qr` version that parses only business/device/PIN/location fields and calls `scan_stamp_atomic` without any selected event context.
- Hosted database is not the blocker: the remote `scan_stamp_atomic` signatures already include the `p_event_venue_id` argument.
- `club/home.tsx` already contains the compact icon-only sign-out pattern that can be mirrored in scanner without introducing a new shared header abstraction.

## Scanner Enforcement Risks

- The scanner header addition must stay compact and not reduce camera space more than necessary.
- The hosted function deploy must preserve current bearer-token validation behavior; the currently active function uses `verify_jwt: false` and validates the token in code.
- Deploying only local mobile code would leave the user-visible hosted bug unresolved.

## Scanner Enforcement Review Outcome

Patch `business/scanner.tsx` with the existing compact sign-out interaction pattern, then redeploy the local `scan-qr` edge function and its `_shared` dependencies to Supabase project `jwhdlcnfhrwdxptmoret` so hosted scans enforce scanner/student event alignment before stamping.

## Current Review (Tag Modal + Community Card Cleanup)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Keep the student profile department-tag creator visible above the keyboard, remove duplicate notification/read affordances from community announcement cards, and make public student club cards larger with a contact/info sheet.

## Community Card Affected Files

- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/features/club/public-club-directory.ts`
- `apps/mobile/src/features/club/public-club-directory-section.tsx`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Community Card Existing Logic Checked

- `student/profile.tsx` icindeki `Ainejärjestötagit` modal'i `KeyboardAvoidingView` ve `ScrollView` kullaniyor, ancak custom-tag `TextInput` focus oldugunda sheet ilgili input'a scroll etmiyor; bu yuzden keyboard acildiginda input kolayca gorus alaninin disinda kaliyor.
- `announcement-feed-section.tsx` ayni kartta hem decorative source `bell` ikonu hem de push-preference `bell` butonu ciziyor; read durumu da hem header pill olarak hem de action row'da `Luettu/Read` etiketiyle tekrar ediyor.
- `public-club-directory.ts` aktif kulup verisini sadece ad, universite, sehir, logo ve cover ile okuyor. Repo ve schema okumasi `clubs` tablosunda `contact_email` oldugunu, ancak club tarafinda `phone` kolonu olmadigini gosteriyor.
- `public-club-directory-section.tsx` club kartlarini announcement kartlarindan daha kucuk bir yatay rail olarak ciziyor ve herhangi bir info/detail affordance sunmuyor.

## Community Card Risks

- Tag modal scroll fix'i backdrop dismiss veya mevcut mutation akisini bozmamali; sadece keyboard sirasinda input gorunurlugu artmali.
- Announcement kartinda decorative ikonu kaldirirken esas push-preference aksiyonu korunmali.
- `Luettu/Read` tekrari azaltilirken unread kartlarda `Merkitse luetuksi` aksiyonu kaybolmamali.
- Club info sheet yalnizca mevcut public alanlari gostermeli; phone kolonu club schema'da olmadigi icin uydurma veri uretilmemeli.
- Daha buyuk club kartlari dar iPhone genisliginde yatay rail davranisini bozmamali.

## Community Card Review Outcome

Student profile tag modal'ine focus oldugunda create alanina scroll eden lokal bir input-visibility duzeltmesi eklenecek. Community announcement kartlarinda decorative bell kaldirilip yalnizca gercek notification toggle kalacak; read durumda ikinci `Luettu/Read` etiketi action row'dan cekilecek. Public club directory query `contact_email` ile genisletilecek; club kartlari daha buyuk render edilip ustlerine info butonu eklenecek ve bu buton full club bilgisi ile tiklanabilir email aksiyonunu acan bir modal gosterecek.

## Current Review (OmaQR Profile Overlay + Scanner-Only Navigation)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Keep the OmaQR profile CTA over the event image instead of pushing the hero down, add safer horizontal spacing to business event action buttons, remove the scanner-only home camera-opening loading surface, and limit scanner-only business users to scanner + history navigation.

## Scanner-Only Affected Files

- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/club/_layout.tsx`
- `apps/mobile/src/features/auth/session-access.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Scanner-Only Existing Logic Checked

- `student/active-event.tsx` currently renders `StudentProfileHeaderAction` in a separate top bar before the hero rail, so the profile CTA consumes vertical space and pushes the image down.
- Business event cards render scanner/history/leave actions inside horizontal rows at the bottom of rail cards. The buttons have internal padding, but the action row can sit too close to the card edges on narrow screens.
- `business/home.tsx` detects scanner-only users and auto-redirects to `/business/scanner`; while this happens it shows `Avataan kameraa...`, which feels wrong because the camera itself lives on the scanner route.
- `business/_layout.tsx` always exposes `home`, `events`, `scanner`, `history`, and `profile` tabs. `session-access.ts` already loads business membership roles but only returns counts, so the layout cannot hide tabs for scanner-only users yet.
- Root redirects use `SessionAccess.homeHref`; scanner-only users can land directly on `/business/scanner` if the access model exposes that destination.

## Scanner-Only Risks

- Hiding business tabs must not block owners/managers from `home/events/profile`; the restriction must apply only when every active business membership is role `SCANNER`.
- Scanner-only users should still be able to recover from history back to scanner, and history should not offer an Events shortcut that reintroduces hidden surfaces.
- If a scanner-only user deep-links to home/events/profile, the layout or screen should redirect to scanner instead of showing forbidden clutter.
- Moving the OmaQR profile CTA over the image must keep the button tappable and readable on both one-event and multi-event hero states.

## Scanner-Only Review Outcome

Add a typed scanner-only flag to `SessionAccess`, route scanner-only business users to `/business/scanner`, and use that flag in `business/_layout.tsx` to hide `home/events/profile` while keeping `scanner` and `history` visible. Remove the home camera-opening loading row for scanner-only accounts by redirecting them away from home. Move the OmaQR profile action into the event hero surface with absolute positioning and add horizontal padding around business event card action rows.

## App Logo Assets Review

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets`
- **Scope:** Replace the Expo placeholder/mobile icon assets with the generated OmaLeima dark-theme lime logo and provide Apple/Android store-size exports.

## App Logo Affected Files

- `apps/mobile/app.config.ts`
- `apps/mobile/assets/images/icon.png`
- `apps/mobile/assets/images/android-icon-foreground.png`
- `apps/mobile/assets/images/android-icon-background.png`
- `apps/mobile/assets/images/splash-icon.png`
- `apps/mobile/assets/images/favicon.png`
- `apps/mobile/assets/images/omaleima-logo-source.png`
- `apps/mobile/assets/store-icons/apple/*`
- `apps/mobile/assets/store-icons/android/*`

## App Logo Existing Logic Checked

- Expo uses `icon` for the shared app icon and an `android.adaptiveIcon` block for Android launcher assets.
- The previous iOS icon path pointed at the generated Expo icon composer directory, so it needed to be replaced with the real OmaLeima PNG.
- App Store and Play Store listing icons should be square RGB PNGs without alpha; the generated source and resized store exports satisfy that requirement.
- Android adaptive icon background should match the dark theme instead of the old pale blue placeholder color.

## App Logo Risks

- Native launcher icons require a rebuild/reinstall before they appear on physical iOS/Android devices.
- Android adaptive icon masking can crop overly detailed edges, so the logo source keeps the mark centered with generous padding.

## App Logo Review Outcome

Use the generated dark/lime OmaLeima mark as the source asset, resize it into Expo runtime icons plus explicit Apple/Android store exports, and point Expo iOS/Android config at the new assets.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Replace the confusing business and organizer mobile stacks with student-style bottom tabs, move student/business announcements to clearer home-screen slider surfaces, tighten the leima pass layout and shared stats bar, and fix the organizer announcement form datetime input plus announcement-media upload RLS failure.

## Affected Files

- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/club/_layout.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/features/rewards/components/student-leima-pass-card.tsx`
- `apps/mobile/src/app/club/announcements.tsx`
- `supabase/migrations/20260504020000_announcement_media_storage.sql`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Existing Logic Checked

- Student navigation already uses `Tabs` plus `GlassTabBarBackground`, while `business` and `club` still use plain `Stack`; this directly matches the reported orientation problem.
- Student announcements are still embedded on the profile screen, while business announcements are on home as a vertical feed card list; neither matches the requested home-first slider mental model.
- The shared `AnnouncementFeedSection` already owns read/ack/preference behavior, so extending it with a rail presentation is lower risk than building a second announcement data surface.
- `StudentLeimaPassCard` leaves wrapped slots left-aligned because the grid has no centering rules, and the active QR screen keeps stamp/tier counters only on the leima face.
- The organizer event form already contains a local calendar-style datetime editor that can be reused for `startsAt`/`endsAt` in mobile club announcements.
- `announcement-media` storage policy uses a malformed UUID regex in `is_announcement_media_object_manager`, which explains the mobile `new row violates row-level security policy` upload failure for club announcement images.

## Risks

- Converting `business` and `club` to tabs must not break existing auth redirects or hidden routes like `updates`.
- Moving student announcements off profile should not remove access to the full update feed; the home surface still needs a path to the full list.
- The new home announcement rail must keep existing acknowledge/CTA/push-preference actions usable on smaller screens.
- Reusing the event datetime picker inside announcements must stay local to mobile club announcements and not disturb existing event editor behavior.
- The storage policy fix is DDL and needs both a committed migration file and a remote Supabase migration apply before the upload bug is truly closed.

## Review Outcome

Implement a focused mobile navigation + announcement UX slice. Reuse the proven student tab shell styling for business and club, extend the existing announcement feed component with a home-friendly slider presentation, move the student announcement surface from profile to events home, center the leima pass slots and lift the stats into a shared top bar, reuse the local calendar editor from club events in club announcements, and ship a Supabase migration that fixes the malformed announcement-media policy regex.

## Current Review (Organizer Home Cleanup + Student Club Discovery)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Remove organizer-home clutter the user no longer wants, move organizer sign-out to the home header, and add a student-visible active club directory with total active club count.

## Profile CTA Affected Files

- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/profile.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/features/club/public-club-directory.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Profile CTA Existing Logic Checked

- Organizer alt menusu zaten `apps/mobile/src/app/club/_layout.tsx` icinde mevcut; home quick-action satirini kaldirmak announcements/events/profile erisimini bozmaz.
- Organizer home icindeki quick actions ve announcement rail kullanicinin kaldirilmasini istedigi tam yuzeydi; bu davranis `club/home.tsx` icinde lokal olarak sahipleniliyor.
- `public.clubs` icin aktif kulup okuma policy'si zaten var; student tarafinda yeni bir service-role yoluna gerek olmadan yalnizca aktif kulup kimlik/veri ozetleri okunabilir.
- Student event discover/home ekrani zaten discovery hero, updates rail ve event listelerini topluyor; aktif kulup dizinini ayni yuzeye eklemek ayrica navigation karmasasi yaratmaz.
- Follow-up review, `student/events` join sonucu hata mesajlarinin eksik oldugunu ve `club/profile` email alaninin validation olmadan kaydedilebildigini gosterdi; iki acik da ayni slice icinde kapatildi.

## Profile CTA Risks

- Organizer home sadeleşirken sign-out yalnizca header'a tasindigi icin fiziksel cihazda loading/error durumu ve tab gecisleriyle cakismazligi smoke edilmelidir.
- Club directory sadece aktif kulup kimlik bilgilerini gostermeli; kulup uye sayisi gibi ek aggregate veriler mevcut RLS ve gizlilik beklentisini buyutmadan eklenmemelidir.
- Student join flow'da tum result status'lar kullaniciya lokalize mesaj vermeli; aksi halde raw status kodu UX'i bozardi.
- Club profile save akisi malformed email'i mutation'a gondermemeli; aksi halde backend'e gereksiz invalid veri yazilirdi.

## Profile CTA Review Outcome

Organizer home'da quick-action satiri ve home announcement rail kaldirilacak, sign-out ust sag header aksiyonuna alinacak ve profile icindeki duplicate sign-out kaldirilacak. Student `events` ana yuzeyine public read policy ile beslenen aktif kulup dizini eklenecek; burada toplam aktif kulup sayisi ve yatay kart listesi gosterilecek, ancak uye sayisi gibi ek aggregate veriler acilmadan mevcut RLS siniri korunacak. Slice tamamlandiktan sonra mobile typecheck/lint, diff-check ve code review tekrar kosulacak.

## Current Review (Card Consistency + Community + Event Freshness)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Normalize mobile slider/card sizing, move student updates + clubs to a dedicated bottom-tab community page, hide profile from student bottom tabs behind a top-right action, keep completed events out of upcoming/edit lists, add pull-to-refresh for event discovery/management screens, and add overlap warnings for simultaneous event windows.

## Form Isolation Affected Files

- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/updates.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/events.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/features/club/public-club-directory.ts`
- `apps/mobile/src/features/club/public-club-directory-section.tsx`
- `apps/mobile/src/features/events/event-overlaps.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Form Isolation Existing Logic Checked

- `student-events` already excludes past events by returning `null` when `end_at < now`, so the main student Tulossa list does not need historical filtering; it needs refresh and overlap guidance.
- Business joinable opportunities already require `join_deadline_at > now` and `start_at > now`; joined events are already split into active/upcoming/completed buckets, so completed events can stay in the explicit history section while not leaking into upcoming.
- Organizer dashboard maps ended `PUBLISHED/ACTIVE` events to `COMPLETED`, but `club/home`, `club/events`, and `club/upcoming` still surface completed events in places that read like upcoming/edit lists.
- `AppScreen` owns the root `ScrollView`, so pull-to-refresh should be added there as an optional prop and then wired into student/business/club event screens.
- `student/updates` already exists but is hidden; it is the lowest-risk target for a visible community tab that groups announcements and active clubs.
- Public club reads are already RLS-safe through active club policy; the UI copy must remove Turkish words like `Kulüpler/kulüp` and use Finnish/English labels only.
- Slider/card height inconsistency is mostly local to announcement rails, business event rails, club home rails, club event chips, and public club cards.

## Form Isolation Risks

- Moving student profile out of the bottom tab must preserve access through a visible header icon on student home/community screens.
- Completed organizer events should remain visible where explicitly historical, but not selectable as editable active/upcoming event chips.
- Pull-to-refresh must not create duplicate mutation calls; it should only refetch query data.
- Overlapping same-day events are valid business cases, so the UI should warn and clarify correct event/QR selection instead of blocking creation or joining.
- Fixed card heights must not clip critical action buttons or make long localized labels unreadable.

## Form Isolation Review Outcome

Implement a focused mobile UX consistency slice. Add `AppScreen.refreshControl`, make student `updates` a visible community tab that contains announcements and a redesigned active club rail, hide student profile from the tab bar but expose it as a header icon, remove announcements/clubs from student event discovery, add query refresh controls to student/business/club event screens, filter organizer completed/cancelled events out of upcoming/edit surfaces, keep completed events only in explicit historical contexts, and add concise overlap warnings so simultaneous event windows are understandable before scanner day.

## Current Review (Profile CTA + Form Isolation)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Make the student profile header CTA explicit with text and simplify the organizer event management screen so create/edit forms are isolated from list/history clutter.

## Current Affected Files

- `apps/mobile/src/features/profile/components/student-profile-header-action.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/updates.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/club/events.tsx`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Current Existing Logic Checked

- Student screens currently use the same icon-only header button for `/student/profile`, so the discoverability issue is local to repeated UI code rather than routing.
- `club/events.tsx` currently stacks three distinct concerns on one screen: manageable event selection, ended history, and the create/edit form. The clutter is local to this screen.
- `deriveTimelineState` in `apps/mobile/src/features/club/club-dashboard.ts` already separates `LIVE`, `UPCOMING`, and `COMPLETED` correctly, so the ended-event bug is not in the timeline derivation.
- The user-visible problem is therefore screen composition: ended/history and selection content sit beside the create/edit form and make the flow feel noisy.

## Current Risks

- Student profile CTA text must stay compact enough for narrow headers and not push title copy off-screen.
- Organizer event editing still needs a clear path from the event list into the edit form after list/history sections are separated.
- Form isolation should reduce noise without hiding ended events entirely; historical items still need an explicit filtered surface.

## Current Review Outcome

Introduce a shared student header CTA component that renders a localized text label next to the profile icon, then replace the repeated icon-only buttons on student event/community/QR/leaderboard/rewards screens. In `club/events.tsx`, turn the route into a pure create/edit form surface, while active event browsing and edit entry continue from the existing organizer home and upcoming views.

## Current Review (Rail Height + Multi Event QR/Scanner + Live Filters)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Remove empty vertical space from slider cards across roles, make simultaneous active events explicitly selectable on student QR and business scanner screens, keep the OmaQR profile action above the hero, allow tap-to-flip QR/leima cards, and fix organizer `Käynnissä` filtering for currently running events.

## Rail + Multi Event Affected Files

- `apps/mobile/src/features/foundation/components/auto-advancing-rail.tsx`
- `apps/mobile/src/features/qr/student-qr.ts`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/club/club-dashboard.ts`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Rail + Multi Event Existing Logic Checked

- `AutoAdvancingRail` lets the horizontal `ScrollView` take the maximum child height, so a shorter active card leaves the page scrolling through empty space until the carousel dots.
- Student OmaQR uses `selectStudentQrEvent`, which returns only the first active event or first upcoming event, so concurrent registered events are hidden from selection.
- Business scanner already has multi-active-event state, but the selector renders below the camera/kiosk surface and is easy to miss during scanning.
- The active QR screen already has a flip animation, but the QR/leima side switch is tied to small buttons instead of the whole card surface.
- `club-dashboard.ts` marks current-window `PUBLISHED` organizer events as `COMPLETED`; business dashboard correctly treats `PUBLISHED` or `ACTIVE` within the runtime window as active.

## Rail + Multi Event Risks

- Adaptive rail height must not clip taller cards when the user swipes to them, and single-card rails should keep their existing centered layouts.
- Student event selection must preserve the selected event while it remains valid and must reset safely when events expire or query data refreshes.
- Scanner selection should be prominent before scanning without blocking valid scanner-only business workflows.
- Organizer live filtering should classify by runtime window while preserving `DRAFT`, `CANCELLED`, and completed behavior.

## Rail + Multi Event Review Outcome

Implement the fix at shared component and read-model roots. `AutoAdvancingRail` will measure active card height and constrain the rail viewport to that card, student QR will derive all active/upcoming registered QR candidates and expose an event selector, business scanner will move the event selector before the camera, and organizer timeline derivation will align with business runtime status semantics.

## Current Review (Swipe QR + Scanner Guard + Announcement Detail)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Remove leftover modal empty space, polish business event action buttons, remove redundant tab-page back buttons, enforce selected event context during scans, replace student/business multi-event pickers with swipeable event cards, and make tiedotteet posts open a real detail screen.

## Swipe QR Affected Files

- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/app/business/updates.tsx`
- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/club/events.tsx`
- `apps/mobile/src/app/club/profile.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `apps/mobile/src/app/club/announcements.tsx`
- `apps/mobile/src/app/club/_layout.tsx`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/student/updates.tsx`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/features/announcements/announcement-detail-screen.tsx`
- `apps/mobile/src/features/announcements/announcements.ts`
- `apps/mobile/src/features/announcements/announcement-popup-bridge.tsx`
- `apps/mobile/src/features/scanner/scanner.ts`
- `apps/mobile/src/features/scanner/scan-transport.ts`
- `apps/mobile/src/features/scanner/types.ts`
- `apps/admin/scripts/smoke-scan-race.ts`
- `apps/admin/scripts/smoke-leaderboard-load.ts`
- `apps/admin/scripts/smoke-reward-unlocked-push.ts`
- `apps/admin/scripts/smoke-qr-security.ts`
- `supabase/functions/scan-qr/index.ts`
- `supabase/migrations/20260504123000_scan_stamp_selected_event_venue_context.sql`
- `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`

## Swipe QR Existing Logic Checked

- Business event preview modal renders a joined-event venue `detailPill`; when stamp label is empty this looks like an empty rounded box above `Sulje`.
- Business live/upcoming rail actions already exist, but secondary buttons do not consistently draw a border in dark mode and long scanner labels can wrap awkwardly.
- Business/club tab screens still render manual chevron-left buttons even though the bottom tab already provides direct navigation.
- Mobile scanner sends only `qrToken`, `businessId`, device, PIN, and location to `scan-qr`; the Edge Function records the event from the QR token and does not compare it to the event selected in scanner UI.
- The atomic `scan_stamp_atomic` RPC already serializes per-student/event scans through the registration row lock; selected `eventVenueId` still needs to be passed into the RPC so Edge validation and the inserted stamp audit trail cannot diverge.
- Student OmaQR has a separate `QR-tapahtuma` selector below the hero, increasing visual clutter; the hero image can own swipe-based event selection instead.
- Business scanner has a vertical event selector; a horizontal snap rail better matches the student mental model and keeps the camera flow cleaner.
- `AnnouncementFeedSection` cards are not detail navigations; only CTA/read/preference buttons are interactive, so tapping a tiedote body cannot open full detail.
- Announcement detail must not depend on the capped 15-item feed; a direct detail route or older visible announcement needs an ID-specific RLS-backed query.

## Swipe QR Risks

- Scan event mismatch must be enforced in the Edge Function, not only client UI, or the wrong-event scan can still succeed.
- Adding scan context fields must preserve existing validation style, require current scanner context, and return typed actionable statuses.
- Swipe selectors must update selected event state without fighting query refetches, scanner locks, or active QR token refresh.
- Hidden announcement detail routes must not appear in bottom tabs, but must keep a back button because they are detail-only routes.
- Removing tab-page back buttons should not remove deeper route back buttons such as student event detail or announcement detail.
- Manual scanner token fallback is useful for hosted/camera failure smoke, but must still send the same selected event context and stay disabled during scan locks.

## Swipe QR Review Outcome

Implement a focused mobile + Supabase fix. Remove the empty joined-event venue pill from the preview modal, add bordered secondary event buttons and compact scanner text, remove redundant back buttons from bottom-tab root screens, pass selected scanner event/venue context through mobile scan transport, require that context in `scan-qr`, validate the selected event venue inside both Edge Function and atomic RPC, replace explicit student QR selector with a swipeable hero rail, replace business scanner selector with a swipeable selected-event rail that pauses camera while moving, and add shared announcement detail screens backed by ID-specific announcement queries reachable from feed cards.

## Current Review (Scanner Reprovision After Revoke)

- **Date:** 2026-05-06
- **Branch:** `bug/scanner-reprovision-after-revoke`
- **Scope:** Fix revoked scanner device sessions getting stuck on the old installation id, keep revoked devices out of the active device list, and show the physical device model in the business scanner devices section when available.

## Scanner Reprovision Existing Logic Checked

- `register_business_scanner_device` returns `DEVICE_REVOKED` when the same `business_id + installation_id` row is revoked or belongs to another scanner user.
- Mobile stores one scanner installation id in SecureStore/localStorage and reuses it across business owner, manager, and anonymous scanner sessions.
- The scanner screen signs out immediately on `ScannerDeviceRevokedError`, which can also affect an active business owner using the same phone after revoking a previous scanner device.
- Owner QR provisioning can create or reactivate devices, but the current payload does not store the physical model, so `Skannerilaitteet` can only show generic platform labels.

## Scanner Reprovision Risks

- A revoked scanner-only account must not regain scanner access without the owner QR flow.
- An active owner/manager opening the scanner on the same phone should not be trapped by a stale revoked installation id.
- Device model storage must be optional so web and older app clients keep working.
- RPC migrations must avoid overloaded function ambiguity by dropping the old signatures before recreating the updated functions.
- Direct scanner registration must remain compatible with older mobile bundles that do not yet send `deviceModel`.

## Scanner Reprovision Review Outcome

Reset the local scanner installation id when the RPC reports `DEVICE_REVOKED`, then retry registration once for the current authenticated actor. This lets legitimate active business users re-register the phone as a fresh device while revoked anonymous scanner users still fail authorization and must use owner QR provisioning again. Add nullable `device_model` storage and pass it through both direct registration and owner QR provisioning. Keep `p_device_model default null` on direct registration so older bundles do not fail before the refreshed app code lands on devices.

## Current Review (Scanner Density + Refresh Spinner + Swipe Clamp)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Scope:** Make business scanner fit real iPhone screens better, stop route-change refetches from showing the pull-to-refresh spinner, move the announcement push preference control into a calmer card location, and clamp student OmaQR swipes to one neighboring event at a time.

## Scanner Density Affected Files

- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/events.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`

## Scanner Density Existing Logic Checked

- Business scanner wraps the camera inside an `InfoCard` with top copy, a multi-line event selector header/help block, manual token help text, and bottom status copy; on narrow iPhones this pushes the QR camera too low and selected event cards can be wider than the visible rail area.
- Student OmaQR hero uses `Math.round(contentOffset.x / eventHeroWidth)`, so a fast fling can jump more than one event because the final offset can skip multiple pages.
- Event refresh screens bind `RefreshControl.refreshing` directly to React Query `isRefetching`; focus/refetch during page changes can therefore display the green spinner even when the user did not pull to refresh.
- Announcement feed cards render the push preference button in the crowded bottom action row with full text (`Ilmoitukset päällä`), making the card feel noisy even though the mutation itself is already wired.

## Scanner Density Risks

- Removing scanner explanatory copy must not remove the selected-event context or the manual token fallback needed for camera failure smoke.
- The selected scanner card must be full-width enough to read but never wider than the screen content area.
- Pull-to-refresh still needs to work manually after hiding background refetch spinners.
- The announcement preference control must remain tappable and must still call the existing preference mutation.
- OmaQR swipe clamp must still allow tap selection and programmatic scroll to the selected event.

## Scanner Density Review Outcome

Keep the fixes local and behavioral: compact the scanner UI by removing redundant explanatory text and moving status information above the camera, constrain the event selector card to the screen content width, use local manual-refresh state instead of query `isRefetching` for `RefreshControl`, move announcement push preference to the card header as an icon control, and calculate the OmaQR swipe target relative to the previous selected index so each gesture advances at most one event.

## Current Review (Mobile Tab/Profile UI Regression Polish)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree, no branch created by this agent.
- **Scope:** Fix mobile tab icons rendering as question marks, remove the bottom-tab floating gap, prevent scanner sign-out clipping, remove dev push diagnostics from the student profile UI, and restore the profile hero name/surname display.

## Mobile Tab/Profile Existing Logic Checked

- Student, business, and club tab layouts pass MaterialIcons names into the shared `TabIcon`; underscore icon names such as `qr_code_scanner` and `account_circle` are not present in `@expo/vector-icons/MaterialIcons` glyph maps and render as `?`.
- The bottom tab styles use `bottom: 16`, which creates a visible gap above the device home indicator on iOS/Android.
- The business scanner top bar can clip the trailing sign-out button when the title/meta copy takes too much horizontal space.
- Student profile rendered the primary department tag as the hero title, so a valid Google/Auth user name was hidden behind department-tag data.
- The dev-only native push diagnostics card was useful during push debugging but is now visual clutter in the tested student profile flow.

## Mobile Tab/Profile Risks

- Icon-name changes must stay within the installed MaterialIcons glyph map to avoid introducing new `?` placeholders.
- Removing the diagnostics card must not remove the actual push permission/register flow.
- Profile name fallback must prefer authenticated Google metadata for the visible person name while preserving department tag context elsewhere.
- Scanner top bar spacing changes must not alter scanner context, camera permissions, or manual-token fallback behavior.

## Mobile Tab/Profile Review Outcome

Apply a focused mobile UI polish. Replace invalid MaterialIcons names with glyph-map-backed names, anchor bottom tabs to `bottom: 0`, allow scanner title copy to shrink while keeping sign-out fixed, remove only the visible diagnostics controls from student profile, and render Google/Auth metadata display name before falling back to profile table display name.

## Current Review (Student Navigation + QR Density + Leaderboard Simplification)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree, no branch created by this agent.
- **Scope:** Shorten the student bottom-tab community label, move the My QR stamp/tier summary out of the vertical path before the QR, and remove extra explanatory copy from the leaderboard screen.

## Student Density Existing Logic Checked

- Student bottom tabs use five visible labels; `Community` is too long on narrow devices and competes with `Leaderboard`.
- My QR renders a two-card progress stat row before the QR card, pushing the QR lower even though the same information can be represented as compact metadata.
- Leaderboard renders a header meta paragraph, event-specific hero explanation, and timeline meta before the actual standings; this reads like onboarding copy after the user already understands the screen.

## Student Density Risks

- Shortening the tab label should not rename the route or screen title, because the Community screen can still use the full heading.
- Moving the QR progress summary must preserve stamp/tier visibility without changing reward or scan semantics.
- Removing leaderboard prose must not remove selected-event status, event switching, loading/error/empty states, or current-user rank display.

## Student Density Review Outcome

Use short tab copy (`News`) for the student updates tab while leaving the Community screen title intact. Remove the large pre-QR progress cards and surface stamp/tier counts as compact QR footer metadata. Simplify leaderboard to title, event selector, statuses, standings, and current-user position by dropping redundant descriptive text.
## Current Review (Admin Mobile Support Inbox + Replies)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Show student, business, and organizer mobile support messages in the admin panel, let platform admins reply safely, and make replies visible back in the sender's mobile support history.

## Admin Support Existing Logic Checked

- Mobile support requests already write to `public.support_requests` with `area` values `STUDENT`, `BUSINESS`, and `CLUB`.
- Mobile support history already reads `admin_reply` and displays it as the support answer, but there is no admin inbox UI for these rows.
- `support_requests` RLS allows active platform admins to manage rows, while student/business/club users can only create and read their own permitted requests.
- Current admin mutation routes verify the browser session with `resolveAdminAccessAsync`, then use service-role RPCs for privileged atomic writes.
- `support_requests` is not yet in the realtime publication, so a sender would normally see a reply only after reopening/refetching support history.

## Admin Support Risks

- Reply writes must not be client-only admin updates; server-side admin access and active profile status must be verified before mutation.
- The sender relationship can be student, business staff, or club staff; the admin inbox must display missing/deleted business or club targets without crashing.
- Replies must update the same `support_requests` row because the mobile app already treats `admin_reply` as the answer source of truth.
- Realtime publication must be idempotent and must not break local environments where `supabase_realtime` is absent.
- API validation must reject empty replies and invalid statuses with actionable errors instead of silently succeeding.

## Admin Support Review Outcome

Implement a focused admin support inbox. Add a security-definer RPC that locks the support request, verifies the admin actor, writes `admin_reply`, updates status/resolution timestamps, and records an audit log. Add an admin page with filters/search/detail/reply form backed by a route-handler mutation. Add `support_requests` to Supabase realtime and subscribe the mobile support sheet to invalidate support history when a reply changes.

## Current Review Outcome (Full Surface QA Sweep)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope checked:** Admin web, organizer web, student mobile, organizer mobile, and business/scanner mobile via five read-only subagents plus local validation.
- **Fixed:** Announcement CTA URL validation now reuses the absolute URL parser and only stores `http`/`https`; organizer claims visible rows are capped per event instead of globally; deleted reward tiers are blocked from restore in code and hosted DB trigger; student QR retries after no-data/error and QR screen-capture protection is focus-scoped; push registration sends the Supabase `apikey`; student event cards expose the map action; organizer mobile event mutations treat non-`SUCCESS` domain statuses as errors; staff-only club members see read-only event previews instead of edit CTAs; organizer announcement reset preserves success notice; revoked reward claims no longer suppress mobile claim candidates; business scanner route params are consumed once, PIN-required devices disable camera reads until PIN is entered, scanner location is sent when permission is granted, inactive businesses are filtered client-side and rejected by the deployed `scan-qr` function.
- **Validation:** Admin `typecheck`, `lint`, and `build` passed. Mobile `typecheck`, `lint`, `export:web`, `audit:realtime-readiness`, `audit:hosted-business-scan-readiness`, `audit:native-push-device-readiness`, `audit:reward-notification-bridge`, and `audit:store-release-readiness` passed. Production smoke: `/` `200`, `/login` `200`, unauth `/admin` and `/club/claims` `307 /login`.
- **Deployment:** Vercel production deploy `dpl_5wxDeKEq5LNbuxeiFEk5YUzT9Rnh` is aliased to `https://omaleima.fi`. Supabase `scan-qr` Edge Function was deployed to `jwhdlcnfhrwdxptmoret`; hosted `prevent_deleted_reward_tier_restore` trigger exists.
- **Residual risks:** Authenticated browser click-through and physical iOS/Android camera/push tests still require real admin/organizer/business/student accounts and devices. `supabase db push --linked` is blocked by remote migration ids missing locally, so the hosted reward-tier restore guard was applied with targeted SQL and should be reconciled with migration history later. Some scale/localization P2 items remain for the next slice: server-side pagination for admin users/support/contact, fraud queue pagination, older organizer list caps, and remaining hardcoded card labels.

## Current Review (Cookie Consent + Public SEO)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Add professional cookie/app-data consent on web and mobile, update legal copy where needed, and strengthen public SEO/AI-search discoverability without touching unrelated admin or event logic.

## Cookie/SEO Existing Logic Checked

- Public web already has privacy and terms pages, contact/apply form consent checkboxes, root metadata, sitemap, robots, and landing page JSON-LD for organization/website.
- The public privacy notice currently says there is no analytics or marketing-cookie layer, but there is no visible preference banner or settings entry point for users.
- Web auth uses essential Supabase/session cookies; non-essential tracking must remain disabled unless explicitly accepted later.
- Mobile already exposes legal links on login/profile surfaces and stores preferences in `expo-secure-store`, but first-run login is not gated by a privacy/app-data acknowledgement.
- Public landing copy is relevant to OmaLeima's real product, but SEO can be improved with stronger canonical/alternate coverage, application/service structured data, FAQ-style extractable content, and a visible cookie settings control.

## Cookie/SEO Risks

- A cookie banner must not imply optional analytics exists if it is not actually loaded, and it must not set optional cookies before consent.
- Users must be able to reopen and change cookie settings; accepting once cannot be a dead-end.
- Mobile wording should not pretend native app storage is browser cookies, but it should clearly cover local storage, push/camera/device identifiers, privacy notice, and terms before login.
- Login buttons should be disabled until the mobile acknowledgement is stored, while already authenticated redirect behavior should remain unchanged.
- SEO metadata and structured data must describe the current pilot/product truthfully and avoid overclaiming consumer purchases, app-store availability, or unsupported features.

## Current Review (Organizer + Business Finnish Sales Decks)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Create two separate Finnish puhekieli presentation decks: one for event organizers/student clubs and one for businesses/venues considering OmaLeima participation/subscription.

## Organizer + Business Sales Deck Findings

- OmaLeima must be positioned as digital infrastructure for Finnish student event culture, not as a generic QR app.
- The organizer buyer cares about appropassi pain, live event control, duplicate prevention, reward handoff, and easy pilot rollout.
- The business buyer cares about fast staff scanning, student footfall visibility, repeatable event participation, and less queue friction.
- `omaleima-pictures` was not present as a separate directory; the matching project-provided/generated assets live under `apps/admin/public/images/public`, `apps/admin/public/images/website-generated`, `apps/mobile/assets/event-covers`, and `docs/presentations/assets/partner-fi`.
- Existing generated/project images are sufficient for both decks; no new logo, pseudo-brand mark, fake UI, or invented metric is needed.

## Organizer + Business Sales Deck Review Outcome

Build two editable PPTX files with Presentations artifact-tool: `docs/presentations/omaleima-organizer-presentation-fi.pptx` and `docs/presentations/omaleima-business-presentation-fi.pptx`. Keep copy conversational Finnish, use dark OmaLeima/lime visual language, use project image assets only, and keep all essential copy as editable slide text.
# Review - Release Candidate Bug Fix Slice

## Scope

- Admin manual organization account creation fails because hosted Supabase/PostgREST cannot find `admin_create_club_owner_account_atomic`.
- Admin announcement update can submit an event-scoped announcement with a non-`STUDENTS` audience, which violates the existing validation invariant.
- Student Approt header profile shortcut can become a navigation no-op after returning from the hidden profile route.
- Business/organization manual account optional public media/social fields should stay optional; existing UI already leaves website, Instagram, logo and banner URLs optional.

## Risks

- Recreating an RPC must preserve service-role-only execution and rollback-safe account creation behavior.
- Event-scoped announcements must retain their `clubId` and `eventId`; only the invalid audience drift should be blocked.
- Mobile profile navigation should not break normal tab back behavior or expose the hidden profile tab.

## Existing Logic

- Existing SQL body lives in `supabase/migrations/20260507194500_admin_club_owner_account.sql`.
- Admin organization route calls `/api/admin/club-accounts/create` and rolls back newly created auth users if the DB RPC fails.
- Announcement validation intentionally requires `eventId => clubId + STUDENTS`.
- `StudentProfileHeaderAction` currently uses a plain `router.push("/student/profile")`.
# Current Review (Published Media Hardening)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Scope:** Admin event and announcement media transport, storage cleanup helpers, and forward Supabase media guard migration.

## Published Media Findings

- Event and announcement publish/update transports already copy private `media-staging` objects into public buckets at publish time.
- Published create/update paths still fall back to caller-supplied `coverImageUrl` / `imageUrl` when no staged path is provided, so an arbitrary public URL can replace published media.
- Announcement update rolls back newly published media only when no row is returned, but not when the DB update returns an error. Event update has the same DB-error rollback gap.
- Existing DB triggers block draft public storage URLs and published rows retaining staging paths, but they do not ensure published event/announcement media URLs belong to the expected public Supabase bucket.

## Published Media Risks

- A malicious or stale client could point published event or announcement media at a third-party URL, bypassing the private staging lifecycle.
- If a publish copy succeeds and the DB update fails, the newly public object can become orphaned.
- DB-level validation must be forward-only; historical migrations are migration history and must not be edited.
