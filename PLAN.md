# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan (Admin Organization Lists + Users Performance)

- **Date:** 2026-05-10
- **Branch:** `fix/admin-org-users-performance`
- **Goal:** Make admin organization state visible, improve user table readability, and remove the most noticeable full-route refreshes from business-applications/users mutations.

## Architectural Decisions

- Extend the existing business-applications server read model to include a bounded existing organization list from `clubs` plus active owner metadata. Keep reads server-side through the current admin page rather than adding client-side service-role access.
- Keep manual account creation APIs unchanged. In the client, update organization list state from the successful create response and avoid `router.refresh()` for manual creation success.
- For admin users, keep the server snapshot but make post-mutation status changes local in client state; recompute counts from local users so status clicks feel immediate.
- Avoid editing already-dirty shared CSS. Use a targeted inline `minWidth` on the users table for the requested extra width.
- Treat broader server-side auth/read-model/RPC consolidation as follow-up; this pass fixes the hot admin surfaces without adding dependencies or schema changes.

## Prompt

Sen OmaLeima admin web performance ve UX hotfix engineer olarak calisiyorsun.
Hedef: `/admin/business-applications` sayfasinda mevcut/olusturulan organizasyonlari listele, `/admin/users` tablosunda ogrenciler icin okunabilir ad goster ve tablo genisligini artir, touched mutationlarda full `router.refresh()` maliyetini azalt.
Mimari: Next.js server read-model + client local state updates + mevcut Supabase RLS/service boundaries. Schema/RLS degisikligi yok.
Kapsam: business-applications read model/types/panel/manual forms, admin-users panel read/use-state rendering, working docs, validation ve deploy. Uncommitted user-owned dashboard/CSS/mobile files'e dokunma.
Cikti: Strict TS/TSX patch, organization list table, local mutation updates, admin validation kaniti, main deploy handoff.
Yasaklar: service_role'u client'a tasimak, global refactor veya React Query dependency eklemek, dirty user dosyalarini stage etmek, broad auth gate rewrite, `any` tipi.
Standartlar: AGENTS.md, Supabase zero-trust, frontend-patterns local state patterns, focused diff.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`

## Current Plan (Finland Location Fields)

- **Date:** 2026-05-10
- **Branch:** `fix/finland-location-fields`
- **Goal:** Standardize location entry for the Finland-only launch: country is fixed to Finland, and city fields use selectable Finnish city values instead of typo-prone free text.

## Architectural Decisions

- Add small shared location constant modules per app (`apps/admin` and `apps/mobile`) so UI and validation use one Finland country value and one city option list in each runtime.
- In admin/web forms, use native `<select>` controls for city and read-only country inputs backed by a constant payload value. Server routes validate the same constants for manual account creation and public business applications.
- Keep organization event city locked from the selected club membership because the business rule scopes events to the club city; only make the event country read-only.
- In mobile business profile, replace city `TextInput` with a modal option picker using existing modal/Pressable patterns to avoid adding dependencies.
- Preserve legacy non-list city values as a current option so existing records can still be saved deliberately.

## Prompt

Sen OmaLeima frontend/form hardening engineer olarak calisiyorsun.
Hedef: Finlandiya-only launch icin country alanlarini sabit `Finland` yap ve city alanlarini Finlandiya sehir secimine cevirerek yazim hatalarini engelle.
Mimari: Next.js form components + route Zod validation + Expo React Native modal selector + app-local location constants. Supabase schema/RLS degisikligi yok.
Kapsam: admin manual business/organization account forms, public business application form, club event country field, mobile business profile city picker, working docs ve validation.
Cikti: Strict TS/TSX patch, country non-editable, city selectable, backend route validation aligned, admin/mobile validation kaniti.
Yasaklar: yeni dependency eklemek, mevcut historical city verisini migration ile silmek, event city scoping kuralini gevsetmek, free-text fallback eklemek, unrelated UI refactor, `any` tipi.
Standartlar: AGENTS.md, frontend-patterns form/accessibility guidance, no silent failures, focused diff.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Hide Operator URL Fields)

- **Date:** 2026-05-10
- **Branch:** `fix/hide-operator-url-fields`
- **Goal:** Stop the organization profile stale-club-id validation loop and simplify operator UI by hiding URL entry fields across web/mobile organization and business surfaces.

## Architectural Decisions

- Keep server-side validation strict. Fix the `Club: Invalid UUID` bug at the client boundary by submitting the selected club id from the authoritative selected-club record instead of trusting editable draft state.
- Hide URL fields in operator/admin/public application forms rather than deleting columns, validation schemas, read models, or historical values. This avoids destructive data changes while removing the confusing UI surface.
- Preserve upload previews and staged media paths. Uploaded images/covers continue using the safe staging/publish flow; manual image/cover URL entry is removed from the UI.
- Keep public/marketing company links outside this hotfix; this pass targets organization/business creation, profile, event, announcement, and application flows.

## Prompt

Sen OmaLeima frontend production hotfix engineer olarak calisiyorsun.
Hedef: Web organizasyon profilinde `Club: Invalid UUID` hatasina yol acan stale client club id kullanımını kapat ve operator-facing URL inputlarini web/mobile organizasyon/isletme akışlarından gizle.
Mimari: Next.js client panels + Expo React Native operator screens + mevcut Supabase media staging/publish akışı. Backend validation, RLS ve schema degisikligi yok.
Kapsam: club profile submit payload, web announcement/event/account/application URL inputs, mobile club/business profile URL inputs, mobile club announcement/event URL inputs, working docs ve validation.
Cikti: Strict TypeScript/TSX patch, gorunur URL inputlari kaldirilmis operator UI, admin/mobile validation kaniti, deploy-ready handoff.
Yasaklar: RLS gevsetmek, URL validation'i gevsetmek, signed staging URL persist etmek, mevcut veriyi migration ile silmek, unrelated public-site redesign, `any` tipi.
Standartlar: AGENTS.md, mevcut upload/staging helperlari, no silent failures, focused diff.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Release Gate Drift + CSP Hardening)

- **Date:** 2026-05-10
- **Branch:** `fix/release-gate-drift-and-csp`
- **Goal:** Clear repo-fixable release-readiness drift by fixing the failing mobile reward audit and reducing admin CSP risk without misrepresenting external launch blockers.

## Architectural Decisions

- Treat the current reward UX as source of truth: foreground unlock/new-stamp feedback is an in-app celebration; local foreground notifications are only for reward stock-change alerts; remote reward-unlocked push remains backend-owned.
- Update the audit script to check durable source markers (`triggerRewardCelebration`, `createRewardCelebrationCandidates`, `REWARD_STOCK_CHANGED_LOCAL`) rather than the removed local unlock notification marker.
- Remove `unsafe-eval` from production CSP while preserving `unsafe-inline` until nonce/hash support is implemented for Next.js runtime inline assets and Turnstile-compatible pages.
- Keep external public-launch blockers explicit in docs/checklists; do not mark device/store/operator/secret gates as complete from repo-only validation.

## Prompt

Sen OmaLeima release-readiness ve security hotfix engineer olarak calisiyorsun.
Hedef: Repo-owned launch gate drift'ini kapat: reward notification audit'i mevcut UX ile hizala, dokumanlari duzelt, admin production CSP'deki gereksiz `unsafe-eval` riskini kaldir.
Mimari: Mobile audit script + mobile/master/testing docs + Next.js static security headers. Supabase schema, RLS ve Edge Function degisikligi yok.
Kapsam: audit/docs/CSP ve working docs; external launch checklist maddelerini yanlis sekilde kapatma.
Cikti: Green `audit:reward-notification-bridge`, admin build/lint/typecheck kaniti, net private-pilot/public-launch handoff.
Yasaklar: unlock icin eski local notification davranisini geri getirme, external store/device/secret gate'lerini repo icinden tamamlanmis gibi isaretleme, production CSP'yi build/runtime'i bozacak sekilde nonce'siz tamamen strict yapma.
Standartlar: AGENTS.md, security-review CSP guidance, no false release claims, focused diff.

## Validation Plan

- `npm --prefix apps/mobile run audit:reward-notification-bridge`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`

## Current Plan (Web Organization Validation Hotfix)

- **Date:** 2026-05-10
- **Branch:** `fix/web-org-profile-announcement-validation`
- **Goal:** Remove production blockers in organization profile update and announcement image upload validation without weakening backend validation or storing expiring signed URLs.

## Architectural Decisions

- Keep validation server-side and strict, but normalize common profile URL inputs before validation so organizers are not blocked by missing protocol or Instagram handle format.
- Surface route field errors in the profile panel instead of collapsing all validation failures into a generic message.
- Split announcement uploaded image preview state from the submitted `imageUrl`: use the signed staging URL only for UI preview, submit `imageStagingPath` for draft/publish, and keep public `imageUrl` for manually provided or already-published URLs.
- Do not increase `imageUrl` max length to accept signed staging URLs because those URLs expire and are not valid durable announcement content.

## Prompt

Sen OmaLeima admin web validation hotfix engineer olarak calisiyorsun.
Hedef: Organizasyon profil guncelleme ve anons gorsel upload validation hatalarini production-safe sekilde duzelt.
Mimari: Next.js route validation + React client payload state + mevcut Supabase storage staging/publish helper'lari. Yeni dependency veya schema degisikligi yok.
Kapsam: `apps/admin` profile route/panel ve announcement payload/preview validation akisi; dokuman/handoff guncellemesi ve admin validation.
Cikti: Strict TypeScript patch, kullaniciya alan bazli profile validation mesaji, staging signed URL'i persistence payload'undan ayiran announcement fix'i, admin type/lint/build kaniti.
Yasaklar: `imageUrl` limitini signed URL saklayacak sekilde gevsetme, expiring signed URL persist etme, RLS/storage policy degistirme, unrelated UI redesign, `any` tipi.
Standartlar: AGENTS.md, Supabase staged media discipline, no silent failures, explicit validation errors, focused diff.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`

## Current Plan (Production Review Deploy + Merge)

- **Date:** 2026-05-10
- **Branch:** `review/production-ready-20260510`
- **Goal:** Ship the validated production-review hardening patch set through commit, hosted Supabase deploy, Vercel admin deploy, verification, merge, and branch cleanup.

## Architectural Decisions

- Commit the already-validated repo patch set before hosted deploy so production artifacts map to a durable Git revision.
- Apply Supabase via linked CLI migration push, then deploy the Edge Function bundles touched by this review (`claim-reward`, `scan-qr`, `send-support-reply-push`).
- Deploy admin from `apps/admin` with Vercel production target so `omaleima.fi` receives the proxy/auth-host changes.
- Keep external gates explicit: native device/store proofs, secret rotation, and observability routine remain outside this terminal unless credentials/tools are already available.

## Prompt

Sen OmaLeima release engineer olarak calisiyorsun.
Hedef: Validated production review patch set'ini guvenli sekilde commit et, hosted Supabase ve Vercel'e uygula, verification kos, main'e merge et ve branch cleanup yap.
Mimari: Git feature branch -> hosted Supabase migration/function deploy -> Vercel production deploy -> smoke/verification -> main merge. Yeni runtime dependency yok.
Kapsam: yalnizca mevcut review branch degisikliklerinin deploy/merge akisi, dokuman/handoff guncellemesi ve kanit komutlari.
Cikti: signed-off git commit, hosted migration/function deploy evidence, Vercel production deployment evidence, verification evidence, PROGRESS/TODOS handoff.
Yasaklar: destructive git komutu yok, migration rewrite yok, secret yazdirma yok, production config'i tahminle degistirme yok, unrelated code edit yok.
Standartlar: AGENTS.md git workflow, Supabase zero-trust deploy discipline, Vercel production smoke, no silent failures.

## Validation Plan

- `git --no-pager diff --check`
- `npx --yes supabase@2.98.2 db push --linked --include-all --yes`
- `npx --yes supabase@2.98.2 functions deploy claim-reward --use-api`
- `npx --yes supabase@2.98.2 functions deploy scan-qr --use-api`
- `npx --yes supabase@2.98.2 functions deploy send-support-reply-push --use-api`
- `npx --yes vercel@latest deploy apps/admin --prod --yes`
- Hosted/admin smoke scripts available for production environment.

## Current Plan (Subagent Production Code Review)

- **Date:** 2026-05-10
- **Branch:** `review/production-ready-20260510`
- **Goal:** Apply verified repo-fixable production-readiness fixes from admin web, mobile, Supabase/RLS/Edge, and release infrastructure subagent reviews.

## Architectural Decisions

- Treat subagent findings as hypotheses until verified in current source; fix concrete P1/P2 risks first and avoid unrelated redesign.
- Preserve existing dirty changes in auth callback, support reply push binding, and mobile push router, but correct the malformed router diff and strengthen all personalized payload types.
- Keep Supabase changes forward-only: create a new migration and replace current RPC/helper definitions rather than rewriting historical migrations.
- Keep Edge rate limiting on `claim-reward` before expensive/privileged RPC execution, using the existing DB-backed limiter helper.
- Make the admin proxy single-source by composing geofence, Supabase session refresh, and dashboard CSRF cookie in `apps/admin/src/proxy.ts`; remove the duplicate proxy entry point.
- Align release scripts/docs around the active production admin host `https://omaleima.fi`, while keeping legacy/admin-domain redirect URLs in the allow-list during transition.

## Prompt

Sen OmaLeima production security/release engineer olarak calisiyorsun.
Hedef: Subagent production review bulgularini dogrula ve repo icinden duzeltilebilen P1/P2 riskleri kapat.
Mimari: mevcut Next.js proxy/route guards, Expo notification/session bridges, Supabase Edge shared helpers, forward SQL migrations/RPC, GitHub Actions ve release docs. Yeni runtime dependency yok.
Kapsam: mobile notification/session boundary, Supabase active-profile/provisioning/reward rate-limit hardening, release host/function/env/workflow inventory, admin password-session error/proxy composition, working docs ve validation.
Cikti: strict TS/TSX/Deno TS/SQL/docs patch, migration validation, admin/mobile/Deno validation evidence, final PROGRESS handoff.
Yasaklar: eski migration rewrite yok, RLS gevsetmek yok, service_role/secret loglamak yok, raw provider/DB details API response'a dondurmek yok, destructive git komutu yok, unrelated UI redesign yok.
Standartlar: AGENTS.md, Supabase zero-trust/RLS, explicit error codes, no silent fallbacks, minimal and focused diff.

## Validation Plan

- `npx --yes supabase@2.98.2 migration up --local --include-all`
- `npx --yes supabase@2.98.2 db lint --local`
- `npx --yes deno check supabase/functions/_shared/http.ts supabase/functions/claim-reward/index.ts supabase/functions/provision-business-scanner-session/index.ts supabase/functions/scan-qr/index.ts supabase/functions/send-support-reply-push/index.ts`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npx --yes actionlint .github/workflows/staging-admin-verification.yml .github/workflows/production-readiness.yml`
- `git --no-pager diff --check`

## Current Plan (Production Ready Final Sweep)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Close the final repo-fixable production readiness findings across admin web, student mobile, business mobile, Supabase Edge/RLS, and release infrastructure.

## Architectural Decisions

- Treat subagent findings as hypotheses until verified in code; patch only concrete repo-fixable P0/P1/P2 issues.
- Keep admin protection layered: route auth, existing origin/referer checks, dashboard double-submit CSRF, and a new password-session CSRF check for the login mutation.
- Keep mobile notification session safety data-driven by binding server push payloads to recipient user ids and dropping mismatches in the router.
- Keep scanner correctness event-id based by refreshing the active business overview before submitting a scan and rejecting stale selected-event context.
- Keep Supabase DB state unchanged where existing constraints/RLS already prove protection; document false positives instead of adding redundant migrations.
- Deploy all Edge Functions importing changed shared helpers after validation so production bundles include the sanitization and payload-binding changes.

## Prompt

Sen OmaLeima final production readiness release engineer olarak calisiyorsun.
Hedef: Admin web, student mobile, business mobile, Supabase Edge/RLS ve release infrastructure icin derin subagent review bulgularini dogrula; repo-fixable production blockers ve shippability risklerini kapat; validation ve deploy evidence ile final handoff yaz.
Mimari: mevcut Next.js route guards/CSRF, Expo typed routers/state, Supabase Edge shared helpers, existing RLS/RPC constraints, GitHub Actions CI ve release docs. Yeni runtime dependency yok.
Kapsam: final production-ready sweep patchleri, validation, Edge Function redeploy, REVIEW/PLAN/TODOS/PROGRESS handoff. Store console, physical device proof, Apple certificate validation ve real observability project setup external gate olarak kalir.
Cikti: strict TS/TSX/Deno TS/docs patch, validation evidence, Supabase function deploy evidence, final handoff.
Yasaklar: RLS gevsetmek yok, eski migration rewrite yok, service_role/secret loglamak yok, false-positive icin gereksiz migration yok, broad redesign/refactor yok.
Standartlar: AGENTS.md, zero-trust, explicit errors, no raw IDs in user/API error details, minimal diff.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npx --yes deno check supabase/functions/_shared/http.ts supabase/functions/scan-qr/index.ts supabase/functions/scheduled-event-reminders/index.ts supabase/functions/send-push-notification/index.ts`
- `git --no-pager diff --check`
- `npx --yes supabase@2.98.2 functions deploy <shared-helper-importing-functions>`
- `npx --yes supabase@2.98.2 functions list`

## Current Plan (Main Release Merge + Low-cost Release Policy)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Clarify that Sentry and EAS are not mandatory blockers, then finish the feature branch by validating, committing, merging to `main`, pushing GitHub, and cleaning safe merged branches.

## Architectural Decisions

- Keep Sentry as optional observability, not a required runtime dependency. Private pilot can use Vercel logs, Supabase logs/advisors, GitHub Actions, and store crash reports manually.
- Keep EAS as the default convenient Expo path, but support local Xcode/Gradle release builds and manual store upload when EAS quota/subscription is unavailable.
- Do not disable Expo Notifications or project-id wiring; local native builds can still use the same public Expo/Supabase env values.
- Follow the branch completion rule: validate before commit, merge into `main`, push `main`, then delete only branches that are merged/safe.

## Prompt

Sen OmaLeima release completion engineer olarak calisiyorsun.
Hedef: Sentry ve EAS maliyet/limit sorularini kod ve dokumanlarda netlestir; mevcut feature branch'i validation sonrasi commit edip main'e merge/push et; gereksiz local branch'leri sadece guvenliyse sil.
Mimari: optional observability docs + local native release mode for store audit + existing GitHub/Vercel/Supabase release gates. Yeni paid service zorunlulugu yok.
Kapsam: master plan, launch/testing docs, mobile store audit script, validation, git commit/merge/push/branch cleanup. Store console ve fiziksel cihaz kaniti external kalir.
Yasaklar: failing validation ile merge yok, unmerged branch force delete yok, secret loglamak yok, destructive reset yok, direct main edit yok.
Standartlar: AGENTS.md git workflow, required commit trailer, minimal policy/code changes.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `OMALEIMA_NATIVE_RELEASE_MODE=local npm --prefix apps/mobile run audit:store-release-readiness`
- `npx --yes deno check supabase/functions/_shared/http.ts supabase/functions/scan-qr/index.ts supabase/functions/scheduled-event-reminders/index.ts supabase/functions/send-push-notification/index.ts`
- `git --no-pager diff --check`

## Current Plan (Organization Release Rollout + Mobile Smoke)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Finish the next release steps after organization hardening: run a mobile organizer edit/save smoke, push Supabase migrations, deploy changed Edge Functions when needed, and record the QA/release note.

## Architectural Decisions

- Add a mobile-side smoke script rather than relying only on admin route smoke, because the reported gap is specifically mobile organizer event edit/save.
- Keep the smoke non-destructive: create a future draft event with the seeded organizer, update it through the hardened RPC, cancel it, then clean up the event and audit rows through local DB SQL.
- Use existing Supabase CLI commands discovered from `--help`: `migration list`, `db push --linked --include-all`, `functions list`, and `functions deploy <name>`.
- Deploy only functions affected by changed Edge/shared code. Database-only organization RPC changes do not require Edge redeploy, but existing modified Edge functions from the P1/P2 slice do.
- Update existing release docs (`PRODUCTION_TEST_CHECKLIST.md` / launch notes) and `PROGRESS.md`; do not create a new planning markdown file.

## Prompt

Sen OmaLeima release stabilization engineer olarak calisiyorsun.
Hedef: Organizasyon RPC hardening sonrasi mobile organizer event edit/save smoke riskini kapat, Supabase hosted migration push ve gerekiyorsa Edge Function deploy adimlarini calistir, QA/release notunu guncelle.
Mimari: mevcut mobile Supabase client env + focused smoke script + Supabase CLI linked project deploy + existing release docs. Yeni runtime dependency yok.
Kapsam: mobile organizer event RPC smoke, Supabase migration/function deployment, QA/release notes, working docs. Admin/student/business genel review fazlarina henuz gecme.
Cikti: smoke/CLI validation evidence, release note patch, PROGRESS handoff.
Yasaklar: service_role/public secret loglamak yok, production data kalintisi birakmak yok, destructive reset yok, unrelated UI refactor yok.
Standartlar: AGENTS.md, Supabase zero-trust/RLS, explicit cleanup, minimal diff.

## Validation Plan

- `npm --prefix apps/mobile run smoke:club-event-rpc`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `npx --yes supabase@2.98.2 migration list`
- `npx --yes supabase@2.98.2 db push --linked --include-all`
- `npx --yes supabase@2.98.2 functions list`
- `npx --yes supabase@2.98.2 functions deploy <changed-function>`
- `git --no-pager diff --check`

## Current Plan (Organization Operations Parity + RLS Hardening)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Close the organization/club operation gaps found by the web/mobile/RLS/test review before moving on to admin, student mobile, or business mobile reviews.

## Architectural Decisions

- Add forward Supabase RPCs for organization operations that currently rely on direct table writes: `update_club_event_atomic`, `cancel_club_event_atomic`, `update_club_department_tag_atomic`, and `delete_club_department_tag_atomic`.
- Keep event media publishing/cleanup in the existing web/mobile transports, but move the final event state write and audit log into RPCs.
- Keep department tag writes route-mediated on web and RPC-mediated in the database; do not reintroduce direct organizer table write policies.
- Add web department tag edit/delete controls in the existing club department tag panel instead of adding a new page.
- Extend existing smoke scripts instead of creating a parallel test framework: event smoke covers update/cancel RPC path; department tag smoke covers update/delete route and RLS direct-write blocks.
- Limit this slice to organization operations. Announcement RPC migration and club profile RPC migration are valid follow-ups but are not mixed into this patch unless required by the tests touched here.

## Prompt

Sen OmaLeima organization/club operations security engineer olarak calisiyorsun.
Hedef: Organizasyon web/mobil operasyonlarinda create/edit/cancel/delete parity aciklarini kapat; Supabase RLS/RPC sinirlarini guclendir; mevcut smoke testlerle create, edit, cancel/archive-benzeri durum ve delete akisini dogrula.
Mimari: forward SQL migration + SECURITY DEFINER RPC + mevcut Next.js route guard/rate-limit/CSRF + Expo mutation transport + mevcut smoke script genisletmesi. Yeni dependency yok.
Kapsam: club events update/cancel, club department tags update/delete, ilgili web UI/API client/validation, mobile event mutation RPC wiring, smoke tests ve working docs. Admin, student mobile ve business mobile genel reviewlari bu slice disinda.
Cikti: strict TS/TSX/SQL patch, Supabase/admin/mobile validation evidence, PROGRESS handoff.
Yasaklar: RLS policy'leri gevsetmek yok, direct organizer table write policy eklemek yok, `any` yok, eski migration rewrite yok, unrelated revert yok, broad UI redesign yok.
Standartlar: AGENTS.md, Supabase zero-trust/RLS, atomic RPC, explicit typed statuses, minimal diff.

## Validation Plan

- `npx --yes supabase@2.98.2 migration up --local --include-all`
- `npx --yes supabase@2.98.2 db lint --local`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run smoke:club-events`
- `npm --prefix apps/admin run smoke:club-department-tags`
- `git --no-pager diff --check`

## Current Plan (Per-business Venue Limit + Session Bootstrap Stabilization)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Re-assert event `perBusinessLimit` dynamic behavior and make mobile auth bootstrap resilient, then deploy DB fix and prepare production rollout notes.

## Architectural Decisions

- Apply a forward-only SQL migration that overrides `public.get_event_per_business_stamp_limit` to parse `stampPolicy.perBusinessLimit` from numeric JSON values and clamp to 1..5, with fallback 1.
- Keep all mobile fixes in existing session provider context and mutation/validation pipeline; no new external service introduction.
- Prefer direct DB query execution on linked hosted DB for now because migration history table is currently diverged between local and remote; align history in a separate reconciliation step.
- Keep UI changes minimal and limited to existing event creation/edit screens (admin and club organizer mobile).
- Do not modify unrelated claim/reward, QR, push, or auth provider setup slices.

## Prompt

Sen OmaLeima production stabilization engineer olarak calisiyorsun.
Hedef: Geçerli riskleri kalıcı olarak kapatmak ve üretime güvenli geçiş için gerekli deploy adımlarını tamamlamak.
Mimari: tek bir SQL forward migration + mevcut provider event-edit/mutation akışlarında küçük normalize+validasyon güncellemeleri.
Kapsam: `get_event_per_business_stamp_limit` fonksiyonu, admin event rules builder/validation, mobile organizer event limit UI ve `SessionProvider`.
Yasaklar: eski migrationların silinmesi yok, güvenlik sınırlarını gevşetmek yok, geniş UI redesign yok.
Standartlar: AGENTS.md, minimal diff, explicit hata mesajı ve typed state.

## Validation Plan

- `npx --yes supabase@2.98.2 migration up --local --include-all`
- `npx --yes supabase@2.98.2 db query --linked "select public.get_event_per_business_stamp_limit('{\"stampPolicy\":{\"perBusinessLimit\":3}}'::jsonb) as limit"`
- `npx --yes supabase@2.98.2 migration list` (remote/local farkının kapatılması planlanacak)
- `git --no-pager diff --check`
## Current Plan (P1/P2 Core Security Hardening)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Close the reported P1/P2 security and production reliability gaps that are still repo-fixable in the current branch.

## Architectural Decisions

- Keep JWT hardening in the existing helpers: HS256 remains the V1 algorithm, but issuer and audience are mandatory signed claims and verification constraints.
- Keep dashboard mutation CSRF as a double-submit cookie/header pattern layered on top of Origin/Referer checks and route-level auth.
- Keep `scan-qr` and `claim-reward` response bodies typed, but use HTTP 4xx/409/423/429 for business-rule failures and blocked operations.
- Do not rewrite old migrations. Add or adjust forward migrations/functions only when DB invariants need hardening.
- Add low-cost push endpoint throttling before recipient expansion to avoid expensive fan-out for abusive retries. Reuse a SECURITY DEFINER RPC rather than adding Redis.
- Sanitize externally returned Edge error details centrally so logs/audit can keep internal context while API responses do not leak user/resource UUIDs or provider/database messages.
- Make mobile scanner submission event-id/event-venue-id based at the moment a barcode is accepted, not based on a later mutable index/selection.
- Reduce QR polling to backend refresh guidance and a sane first retry rather than aggressive sub-second loops.

## Prompt

Sen OmaLeima Supabase Edge Function + Next.js Admin + Expo mobile security hardening engineer olarak calisiyorsun.
Hedef: P1/P2 bulgularindaki token claim dogrulama, dashboard CSRF, scan/reward HTTP semantigi, reward event gate, QR rate-limit sirasi, push throttling/detail leakage, mobile session/scanner state ve QR refresh risklerini repo-fixable kisimlarda kapat.
Mimari: mevcut shared JWT/http helpers + Edge Function typed response mapping + forward Supabase migration/RPC + dashboard double-submit CSRF + mobile event-id based scanner snapshot + backend-driven QR refresh cadence. Yeni dependency yok.
Kapsam: yalnizca raporlanan dosyalar, gerekli migration ve working docs. Hosted provider ayarlari, Apple credential validation, native store release ve unrelated UI polish bu slice disinda kalir.
Cikti: strict TS/Deno TS/SQL patch, admin/mobile/Supabase/Deno validation evidence, PROGRESS handoff.
Yasaklar: `any` yok, RLS bypass yok, eski migration rewrite yok, HTTP 200 ile is kural hatasi dondurmek yok, ham UUID/provider/DB hata detaylarini API response `details` icinde gostermek yok, unrelated revert yok.
Standartlar: AGENTS.md, security-review checklist, api-design HTTP semantics, explicit errors, minimal diff.

## Validation Plan

- `npx --yes deno check supabase/functions/_shared/http.ts supabase/functions/_shared/qrJwt.ts supabase/functions/_shared/businessScannerLoginJwt.ts supabase/functions/scan-qr/index.ts supabase/functions/claim-reward/index.ts supabase/functions/generate-qr-token/index.ts supabase/functions/send-announcement-push/index.ts supabase/functions/send-push-notification/index.ts supabase/functions/send-support-reply-push/index.ts`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npx --yes supabase@2.98.2 migration up --local --include-all`
- `npx --yes supabase@2.98.2 db lint --local`
- `git --no-pager diff --check`

## Current Plan (Ignored Local Artifact Cleanup)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Remove only the repo-ignored local artifact folders under `outputs/` and `tmp/` that are not part of the application/runtime source tree.

## Architectural Decisions

- Treat `outputs/` and `tmp/` as disposable local artifacts because root `.gitignore` excludes both directories.
- Keep cleanup narrow: do not touch tracked docs, source files, config, or historical report markdown files even if they look review-related.
- Delete the artifact directories as a local workspace cleanup, not as a product behavior change.
- Validate with targeted git/rg checks instead of broad app builds, because no runtime code path changes in this slice.

## Prompt

Sen OmaLeima repo hygiene engineer olarak calisiyorsun.
Hedef: Kullanimda olmayan ve repo tarafindan zaten ignore edilen lokal artefakt klasorlerini guvenli sekilde temizle.
Mimari: Referans taramasi + `.gitignore` kaniti + dar kapsamli dosya/klasor silme + git/rg dogrulamasi. Yeni dependency yok.
Kapsam: `outputs/` ve `tmp/` altindaki lokal preview/QA artefaktlari ile working docs guncellemesi. Kaynak kod, tracked rapor markdown'lari, config veya runtime dosyalari degismeyecek.
Cikti: Minimal doc patch, lokal artefakt temizligi, dar validation ve handoff notu.
Yasaklar: Tracked source dosyalarini tahmine dayali silmek yok, `RAPOR.md` veya `REVIEW_RESULT.md` gibi referansli raporlari silmek yok, unrelated revert yok.
Standartlar: AGENTS.md, minimal diff, kanita dayali silme, explicit validation.

## Validation Plan

- `git status --short --ignored outputs tmp`
- `rg -n --hidden --glob '!node_modules' --glob '!.git' 'qa-production-hardening|verification-sweep|partner-preview|presentation-preview|public-landing-smoke'`
- `git --no-pager diff --check -- REVIEW.md PLAN.md TODOS.md PROGRESS.md`

## Current Plan (City/Event Scoped Announcements + Business History)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Finish business-owned scan history and make announcements safely scopeable by city, event, and organizer-owned audience.

## Architectural Decisions

- Keep business history behind a SECURITY DEFINER RPC that returns rows only for businesses where the current user is active staff.
- Add `target_city` as a nullable announcement scope field and enforce it in `can_read_announcement`.
- Replace the event-scope trigger logic so event announcements can target `ALL`, `STUDENTS`, or `BUSINESSES`, while still requiring the event to belong to the selected club.
- Carry `targetCity` through admin types, validation, transport, create/update routes, read-model, compose/edit UI, and list state.
- Push recipient expansion respects city and event filters so notification delivery does not exceed the same audience shape that in-app RLS allows.
- Mobile business history copy now reflects business-wide history instead of operator-only rows.

## Prompt

Sen OmaLeima Supabase + Next.js + Expo release engineer olarak calisiyorsun.
Hedef: Isletme historia ekraninda joined event scan gecmisi isletme bazli gorunsun; admin/organizer announcements sehir, event ve organizasyon kapsamiyla guvenli sekilde olusturulup gonderilebilsin.
Mimari: SECURITY DEFINER business history RPC + nullable `announcements.target_city` + RLS helper hardening + admin form/read-model/transport wiring + push recipient resolver filtering. Yeni dependency yok.
Kapsam: business scan history, announcement city/event/audience scope, admin announcement compose/edit/list, push recipient expansion, working docs. Mobil announcement UI mevcut RLS feed okumaya devam eder.
Cikti: SQL migration, strict TS/TSX/Deno TS patch, docs handoff.
Yasaklar: RLS bypass yok, event-scoped `CLUBS` audience yok, baska organizasyonun announcementlarini gosterme yok, ham UUID'leri user-facing copy'ye donusturme yok, unrelated revert yok.
Standartlar: AGENTS.md, city-ready multi-tenant model, explicit errors, minimal diff.

## Validation Plan

- `npx --yes deno check supabase/functions/send-announcement-push/index.ts`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run lint`
- `npx --yes supabase@2.98.2 migration up --local --include-all`
- `npx --yes supabase@2.98.2 db lint --local`

## Current Plan (Organizer Reward Claim Visibility)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Make organizer reward claim screens operationally complete by showing under-threshold student reward progress without allowing invalid reward handoff.

## Architectural Decisions

- Keep `candidates` as the authoritative claimable handoff queue. Do not enable a button for students below the required leima count.
- Add `progress` rows derived from the same registrations, active reward tiers, valid stamps, and claimed rewards used by the claim queue.
- Exclude already `CLAIMED` rewards from both claimable and progress lists, but do not let `REVOKED` history permanently hide a student/tier.
- Update both web and mobile read models so organizer behavior stays consistent across surfaces.
- Keep backend/RPC/Edge Function behavior unchanged; the backend already rejects not-enough-stamps claims.
- Add a scoped `get_club_claim_student_labels` RPC that returns display names only for students registered to events managed by the current active club staff user.
- Use display names in claimable/progress/recent claim rows, with masked id as a last-resort fallback only when no name exists.
- Add mobile event filter chips and filter claimable/progress/recent rows by the selected event.

## Prompt

Sen OmaLeima organizer reward-flow engineer olarak calisiyorsun.
Hedef: Club/organizer claim ekranlarinda yeterli leimasi olmayan ogrenciler de ilerleme olarak gorunsun; ogrenciler UUID yerine ad-soyad/display name ile gorunsun; mobilde birden fazla etkinlik icin claim/progress/history listeleri secili etkinlige gore filtrelensin; odul teslim aksiyonu sadece yeterli leimasi olan claimable adaylarda aktif kalsin.
Mimari: mevcut `event_registrations`, `reward_tiers`, `stamps`, `reward_claims` read-model composition + scoped student-label RPC + web/mobile UI read-only progress bolumu + mobile event filter. Yeni tablo yok.
Kapsam: admin/mobile club claims read model, types, claim screen UI, scoped Supabase migration, working docs ve validation. Reward claim RPC, unrelated organizer pages degismeyecek.
Cikti: strict typed TS/TSX patch, web/mobile validation evidence.
Yasaklar: client tarafinda invalid claim enable etmek yok, RLS bypass yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, minimal diff, explicit typed data, operation-safe UX.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npx --yes supabase@2.98.2 migration up --local --include-all`
- `git --no-pager diff --check`

## Current Plan (Security Findings Hardening)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Close the verified security review findings without broadening product behavior or weakening existing RLS/RPC boundaries.

## Architectural Decisions

- Add a forward Supabase migration for RLS/helper fixes and promotion push atomicity. Do not rewrite old migrations.
- For club-scoped eventless announcements, target only operational events (`PUBLISHED`/`ACTIVE`) so past/completed/archived event relationships do not widen recipients.
- Map typed reward claim statuses to HTTP status codes in the Edge Function and admin transport. Keep `REWARD_ALREADY_CLAIMED` idempotent-success for mobile UI, but do not return 200 for authorization/eligibility failures.
- Add a DB-side advisory-lock-backed promotion push limiter and call it before push delivery.
- Add recipient user binding to remote announcement push payloads and reject mismatched payloads in the mobile router.
- Use local Supabase sign-out for invalid refresh-token cleanup, then delete the local auth key as a final cleanup step.
- Reduce scanner warning context to counts/error class rather than raw student/event IDs.

## Prompt

Sen OmaLeima Supabase Edge Function + Expo security hardening engineer olarak calisiyorsun.
Hedef: Sub-agent review ile dogrulanan announcement recipient widening, reward claim HTTP semantics, promotion push race, active-profile RLS consistency, announcement push audit gaps, mobile notification session binding, invalid refresh-token cleanup ve scanner PII-ish warning log bulgularini minimal patch ile kapat.
Mimari: forward SQL migration + focused Edge Function changes + mobile router/session cleanup + existing validation commands. Yeni dependency yok.
Kapsam: `send-announcement-push`, `claim-reward`, `send-push-notification`, RLS/helper migration, mobile push router/session provider, scan-qr warning context, working docs ve validation. Product audience modelini veya reward RPC invariantlerini genisletmek yok.
Cikti: strict TS/Deno TS/SQL patch, validation evidence, handoff.
Yasaklar: RLS bypass yok, old migration rewrite yok, ham user/event IDs warning log'a koymak yok, typed reward failurelari HTTP 200 dondurmek yok, unrelated revert yok.
Standartlar: AGENTS.md, Codex Security fix-finding workflow, explicit errors, minimal diff, no `any`.

## Validation Plan

- `npx --yes deno check supabase/functions/send-announcement-push/index.ts supabase/functions/send-push-notification/index.ts supabase/functions/claim-reward/index.ts supabase/functions/scan-qr/index.ts`
- `npx --yes supabase@2.98.2 migration up --local --include-all`
- `npx --yes supabase@2.98.2 db lint --local`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `git --no-pager diff --check`

## Current Plan (Reward Path + Tiedotteet Ticket Polish)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Make the event detail reward path feel more compact and make Yhteisö announcement cards visually match the Approt ticket card system.

## Architectural Decisions

- Keep this as a mobile UI-only slice; no Supabase, routing, or announcement data model changes.
- Compact reward path by reducing card padding, group gaps, icon size, tier row padding, instruction box padding, and progress track height.
- Reuse the existing `AnnouncementFeedSection` rail presentation for Yhteisö instead of adding a separate announcement card component.
- Apply Approt-inspired ticket structure only when `presentation="rail"` so business/club stack usages keep their current layout.

## Prompt

Sen OmaLeima Expo mobile UI polish engineer olarak calisiyorsun.
Hedef: Event detail icindeki `Palkintopolku/Reward path` kartini daha kompakt hale getir; Yhteisö `Tiedotteet/Updates` rail kartlarini Approt kartlarina benzeyen ticket tasarimina yaklastir.
Mimari: mevcut style tokenlari + `AnnouncementFeedSection` rail variant + event detail reward path style tightening. Yeni component veya dependency yok.
Kapsam: mobile student event detail reward path, announcement feed rail card presentation, working docs ve validation. Data fetching, realtime, mark-read, push preference, CTA ve detail routing davranisi degismeyecek.
Cikti: strict TS/TSX patch, mobile typecheck/lint/diff-check evidence.
Yasaklar: backend/schema degisikligi yok, announcement actionlarini kaldirmak yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, existing Approt ticket visual language, minimal diff, accessible controls.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Event-Centered Student Rewards Navigation)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Make rewards part of the Approt/event flow, remove Rewards from the visible student tab bar, restore Profile as a real bottom tab, and remove duplicated header profile buttons.

## Architectural Decisions

- Do not add a Supabase migration for this slice. The current schema and RLS policies already expose the needed student-owned reward state through existing tables.
- Use the existing `useStudentRewardOverviewQuery` on Approt to decorate event cards with claimable/claimed/progress states.
- Use `useStudentRewardEventQuery` on event detail so reward tiers include claim status, missing stamps, inventory, and staff handoff instructions directly in the event page.
- Hide the legacy Rewards tab from bottom navigation but leave the route available as an internal compatibility screen during this transition.
- Show Profile as a bottom tab and remove `StudentProfileHeaderAction` from student content headers.
- Update reward push tap routing to open the relevant event detail when an event id exists, otherwise Approt.

## Prompt

Sen OmaLeima Expo + Supabase urun mimarisi engineer olarak calisiyorsun.
Hedef: Ogrenci odul deneyimini ayri `Palkinnot` tab'indan event/Approt baglamina tasi; claimable/claimed reward state Approt kartinda farkli gorunsun; event detail icinde tum reward tier, progress, claim/handoff bilgisi gorunsun; alt menude Profile geri gelsin ve sag ust profil butonlari kaldirilsin.
Mimari: mevcut Supabase tablolarindan client query composition (`reward_tiers`, `reward_claims`, `stamps`, `event_registrations`) + Expo tab navigation sadeleştirme + existing reward query hooks. Yeni tablo/RPC yok.
Kapsam: mobile student tabs, Approt card/detail, reward push routing, header profile buttons, working docs ve validation. Organizer reward handoff/RPC, DB RLS, admin panel ve native auth degismeyecek.
Cikti: strict typed TS/TSX patch, no schema migration, mobile validation.
Yasaklar: RLS bypass yok, reward claim'i client tarafinda yazmak yok, `any` yok, unrelated revert yok, Palkinnot route'unu deep-link compatibility bozulacak sekilde silmek yok.
Standartlar: AGENTS.md, event-centered UX, minimal diff, accessible controls, existing visual system.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Push Payload Session Boundary + Scanner Error Sanitization)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Prevent old notification tap payloads from crossing authentication sessions and stop scanner transport from surfacing raw non-JSON backend/gateway response bodies.

## Architectural Decisions

- Treat `userId` as part of the notification routing boundary. When it changes, clear any queued tap payload and duplicate-response key before updating the current user ref.
- Keep push tap routing behavior unchanged for valid role/payload combinations, but clear unrouteable payloads instead of leaving them pending.
- Preserve known scanner API responses as-is, because those are already product-safe typed responses. For unknown or non-JSON bodies, throw status plus a generic body classification only.

## Prompt

Sen Expo notification ve scanner transport hardening engineer olarak calisiyorsun.
Hedef: Notification tap payload'lari logout/login veya kullanici degisiminde eski oturumdan yeni oturuma tasinmasin; scan-qr transport non-JSON backend/gateway hata govdelerini kullanici/log hata mesajina ham olarak koymasin.
Mimari: `AnnouncementPushRouterBridge` icinde userId session boundary cleanup + unrouteable payload cleanup; `scan-transport.ts` icinde typed scan response korunarak unknown body sanitization. Yeni dependency yok.
Kapsam: yalnizca mobile notification router, scanner transport, working docs ve validation. Push provider, backend RPC, UI redesign veya unrelated role flow yok.
Cikti: strict TS/TSX patch, mobile typecheck/lint/diff-check evidence.
Yasaklar: ham non-JSON response body gostermek yok, stale payload'i beklemede birakmak yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, explicit errors, minimal diff, English comments.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Business Announcement Push Delivery)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Make business-side announcement push delivery and in-app refresh work instantly for organizer/admin sent pushes, without regressing student delivery.

## Architectural Decisions

- For club-scoped `BUSINESSES` announcements, resolve recipients from `business_staff` linked to businesses that are `JOINED` to the club's events.
- For club-scoped `ALL`, include student registrations, club staff, and joined business staff.
- Keep event-scoped announcements constrained to `STUDENTS`; do not loosen that DB invariant.
- Extend `can_read_announcement` so joined business staff can read club-scoped `BUSINESSES` announcements.
- On mobile foreground push receipt, invalidate announcement active/feed/detail queries for the current user so popup/feed can refresh even when only a push delivery attempt changes.

## Prompt

Sen Supabase Edge Function + Expo notification release engineer olarak calisiyorsun.
Hedef: Organizer/admin panelinden business tarafi icin send push yapildiginda isletme kullanicilari hem push recipient olarak cozulmeli hem de foreground app acikken announcement popup/feed aninda yenilenmeli.
Mimari: `send-announcement-push` recipient resolver + `can_read_announcement` RLS helper migration + mobile foreground notification listener query invalidation. Yeni dependency yok.
Kapsam: business announcement push delivery, club-scoped business visibility, mobile foreground invalidation, docs and validation. Student event-scoped behavior korunacak.
Cikti: strict TS/Deno TS + SQL migration + mobile validation + Supabase deploy proof.
Yasaklar: event-scoped announcement audience invariantini gevsetmek yok, RLS bypass yok, realtime payloadina guvenme yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, explicit error context, minimal diff, production deploy.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npx --yes supabase@2.98.2 db push --linked`
- `npx --yes supabase@2.98.2 functions deploy send-announcement-push --project-ref jwhdlcnfhrwdxptmoret`
- `git --no-pager diff --check`

## Current Plan (Announcement Realtime Regression + Profile Panel Cleanup)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Stop the mobile announcement realtime subscription crash, make popup announcement imagery consistent with the full feed fallback, and remove duplicated organizer profile header content.

## Architectural Decisions

- Keep realtime invalidation behavior intact, but use a unique channel topic per hook instance so concurrent feed/popup subscribers do not mutate an already subscribed channel.
- Keep using query invalidation rather than trusting realtime payload content.
- Use the same `eventDiscovery` fallback image in popup announcements that the announcement feed already uses.
- Remove only the duplicated intro panel from the web organizer profile form; keep selected-club and edit surfaces unchanged.

## Prompt

Sen Expo + Next.js release regression engineer olarak calisiyorsun.
Hedef: Send push sonrasi business/organizer mobile screen'de dusen `cannot add postgres_changes callbacks ... after subscribe()` hatasini kokten duzelt; announcement popup'ta custom image yoksa feed ile ayni default gorseli goster; hosted organizer profile sayfasinda route header'i tekrar eden ikinci profile intro panelini kaldir.
Mimari: Supabase realtime channel instance topic izolasyonu + mevcut `CoverImageSurface` fallback + focused Next.js panel cleanup. Yeni dependency yok.
Kapsam: `announcements.ts`, `announcement-popup-bridge.tsx`, `club-profile-panel.tsx`, docs, validation, web deploy. Push sending backend davranisini veya RLS'i degistirmek yok.
Cikti: strict typed TS/TSX patch, validation results, deployed admin URL if web changed.
Yasaklar: realtime payloadina guvenme, duplicate subscription cleanup'i sessizce yutma, default image'i hardcoded remote URL yapma, unrelated revert yok.
Standartlar: AGENTS.md, minimal diff, accessible existing UI, no `any`.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- Vercel production deploy for the admin profile cleanup

## Current Plan (Hosted Event + Realtime Refresh Fixes)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Fix hosted admin event ticket URL persistence, remove DB IDs from announcement success/error-facing UI copy, make post-event follow-up announcements visible immediately through realtime invalidation, and prevent pull-to-refresh from hanging indefinitely.

## Hosted Event + Realtime Refresh Architectural Decisions

- Normalize optional `ticketUrl` once in the event update transport and write only the trimmed value or `null`.
- Keep announcement mutation statuses machine-readable while replacing success messages with generic user-safe copy.
- Keep post-event follow-up event-scoped, but set `startsAt` to the current time so mobile feed/popup queries can see it immediately.
- Add a Supabase realtime `postgres_changes` subscription for announcement invalidation and preserve the existing interval as a resilience layer.
- Add a bounded timeout to the shared manual refresh hook so all screens using it stop the native refresh animation even when a refetch hangs.

## Prompt

Sen release odakli Next.js + Expo + Supabase engineer olarak calisiyorsun.
Hedef: Web event create/update akisini `events_ticket_url_http_check` icin guvenli hale getir; announcement mutation mesajlarindan UUID gosterimini kaldir; post-event follow-up duyurusunu anlik gorunur ve realtime invalidation destekli hale getir; mobil pull-to-refresh spinner'inin sonsuz kalmasini ortak hook seviyesinde engelle; ardindan admin app'i Vercel production'a deploy et.
Mimari: mevcut transport katmani, Supabase realtime channel invalidation, shared `useManualRefresh`, Vercel admin deployment. Yeni dependency yok.
Kapsam: admin event/announcement/report transport UI, mobile announcements/manual refresh hook, working docs, validation, Vercel deploy. DB constraint'i gevsetmek veya RLS'i bypass etmek yok.
Cikti: strict typed TS/TSX patch, validation results, deployed Vercel URL.
Yasaklar: kullaniciya DB UUID gosterme, ham untrimmed URL yazma, realtime payloadina guvenme, `any` kullanma, unrelated revert yok.
Standartlar: AGENTS.md, structured errors/logs, minimal diff, production release validation.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- Vercel production deploy for `apps/admin`

## Current Plan (Store Polish, Localized Apple Login, Live Leima Consistency)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Make the first-run mobile experience feel store-ready, keep Sign in with Apple copy in Finnish/English only, harden student leima-pass metadata refresh, and quiet the actionable invalid refresh-token startup path.

## Store Polish Architectural Decisions

- Keep the login slider as the primary visual anchor, but make the sign-in surface more intentional: compact language control, segmented role selection, clearer student/business action grouping, and tighter spacing.
- Replace the native rendered Apple button with an app-rendered Apple-styled button that uses OmaLeima localization while preserving the existing `signInWithAppleAsync` native credential flow.
- Upgrade the student community page with a stronger contextual header and a redesigned club directory presentation using the existing data model and modal behavior.
- Compute leima pass capacity from the freshest available sources: event detail minimum, reward overview minimum, QR context minimum, venue count, and actual collected stamp count. Add always-refetch options to student metadata queries so organizer-side event changes do not linger in mobile caches.
- Treat Debug-only startup logs as non-blocking unless they reveal app state corruption. Fix invalid refresh-token cleanup at the Supabase storage boundary; leave framework/device warnings documented.

## Prompt

Sen OmaLeima mobile store-polish engineer olarak calisiyorsun.
Hedef: Login ekranini slider korunarak daha kaliteli hale getir; Apple ile giris copy'sini uygulama diline bagla; student Yhteisö sayfasini modernize et; event leima sayisi guncellenince leima karti dahil ogrenci yuzeylerinde eski cache kalmasini engelle; startup loglarindaki gercek app hatasini duzelt.
Mimari: Expo React Native mevcut component sistemi + localized copy + React Query refetch hardening + focused UI component updates + Supabase local auth storage cleanup.
Kapsam: mobile auth/login, Apple/Google auth button components, public club directory/community screen, student event/reward/QR query freshness, session bootstrap cleanup, working docs ve validation. Supabase provider credentials, store submission, unrelated role flows yok.
Cikti: strict TS/TSX patch, app-language Apple button, daha iyi login/community UI, leima slot consistency fix, startup log triage, validation evidence.
Yasaklar: yeni global UI framework eklemek yok, Turkish Apple/login copy yok, stale cache'i gizleyen fallback yok, Apple auth flow'u geri almak yok, destructive git reset yok.
Standartlar: AGENTS.md focused changes, frontend-design/frontend-patterns, Expo native UI rules, strict typing, explicit errors.

## Current Plan (Physical iOS Xcode Build Fix)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Make the local Xcode Debug iPhoneOS build installable on a physical phone by fixing the native linker failure without changing app auth behavior.

## Physical iOS Xcode Build Fix Architectural Decisions

- Keep the Apple Sign-In implementation and entitlements unchanged; the native module is present in Pods and is not the compile/link failure.
- Fix the device Debug linker failure at the native build configuration layer by building React Native core from source instead of using the prebuilt core framework for iPhoneOS.
- Regenerate CocoaPods after changing `Podfile.properties.json` so Xcode and CLI builds use the same source-of-truth configuration.
- Validate with TypeScript, store readiness audit, and `xcodebuild` for generic iOS with code signing disabled. Then run a signing-enabled build if possible to reveal remaining provisioning-only issues separately.
- Result: source-built React Native core is now persisted through `expo-build-properties`; local pods are regenerated; both generic iOS Debug build paths pass.

## Prompt

Sen OmaLeima iOS release build engineer olarak calisiyorsun.
Hedef: Xcode'dan fiziksel iPhone'a kurulumdan once dusen native build hatalarini bul ve repo tarafinda duzelt.
Mimari: mevcut Expo prebuild iOS projesi + CocoaPods config + React Native new architecture linker diagnosis + source-of-truth Podfile properties update + reproducible xcodebuild validation.
Kapsam: `apps/mobile/ios/Podfile.properties.json`, CocoaPods generated state, working docs ve build validation. Apple/Supabase provider ayarlarini veya auth UI davranisini degistirmek yok.
Cikti: physical-device class Debug iPhoneOS build'in compile/link asamasini gecmesi, varsa kalan signing/provisioning hatasinin ayri raporlanmasi.
Yasaklar: Apple Sign-In kodunu geri almak yok, destructive git reset yok, generated olmayan dosyalari gereksiz refactor etmek yok, signing hatasini compile hatasi gibi saklamak yok.
Standartlar: AGENTS.md focused changes, explicit errors, no silent fallback, non-interactive xcodebuild validation.

## Current Plan (Store Release Prep + Apple Sign-In)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Clean the current release branch state, mark physical QR scanning as externally tested, then add native Sign in with Apple wiring for App Store readiness.

## Store Release Prep + Apple Sign-In Architectural Decisions

- Do not mix QR proof with push proof. Update the production gap wording only for physical QR/camera scanning, while keeping Android/iOS notification delivery and store-signed behavior as separate open evidence.
- Keep the notification-card uncommitted change if validation passes: after successful registration, the ready pill is enough feedback and redundant summary copy can be hidden.
- Start Apple login from a clean branch after committing the current workspace state. The Apple slice should include provider/config setup, mobile UI, auth callback/session handling, and validation, but should not fake external App Store Connect or Apple Developer actions that require owner login.
- Use native `expo-apple-authentication` on iOS and Supabase `signInWithIdToken({ provider: "apple" })` instead of a browser OAuth redirect. This keeps the App Store login surface native and avoids adding Apple UI on Android/web.
- Treat Apple Developer capability setup, Supabase Auth provider setup, and physical TestFlight smoke as separate gates. The App ID capability is now enabled for `fi.omaleima.mobile`; hosted Supabase provider confirmation and device smoke remain release proof items.

## Prompt

Sen OmaLeima store-release engineer olarak calisiyorsun.
Hedef: Fiziksel cihaz QR scan kanitini remaining gaps dosyasinda kapat; mevcut uncommitted notification-card polish'i dogrulayip commit'le; ardindan App Store yayin hedefi icin Apple Sign in entegrasyonuna temiz branch'ten basla.
Mimari: docs/progress handoff update + mobile validation + focused commit + yeni feature branch + Apple Developer/App Store Connect owner-login destekli setup + Expo/Supabase auth entegrasyonu.
Kapsam: `docs/PRODUCTION_REMAINING_GAPS.md`, working docs, `apps/mobile/src/features/push/push-notification-setup-card.tsx`, git cleanup ve Apple login hazirligi. Sentry, custom domain, store submission final publish ve push proof bu slice'ta yok.
Cikti: temiz git state, QR proof documentation, committed notification polish, Apple login branch ready.
Yasaklar: fiziksel push/testflight kanitini QR kaniti gibi gostermek yok, destructive git reset yok, Apple hesabinda kullanici onayi olmadan externally visible/paid/destructive aksiyon yok, false provider setup success yok.
Standartlar: AGENTS.md focused changes, strict typing, explicit limitations, non-interactive git diff, validation before commit.

## Current Plan (Notification Completion)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Finish notification behavior that can be completed in repo: role-visible push setup, automatic token registration after permission is already granted, tap-routing for all existing push payload types, duplicate reward alert prevention, and honest token/background proof documentation.

## Notification Completion Architectural Decisions

- Keep Expo/Supabase as the notification architecture. Do not add a new provider or Sentry/observability wiring in this slice.
- Add a role-neutral auto-registration bridge that only runs when OS permission is already granted/provisional, so it never surprises users with a permission prompt.
- Add business/club notification setup cards in existing profile settings, matching the student profile capability without changing scanner-only flows.
- Preserve announcement routing exactly, then extend the same router to handle reward unlocks, event reminders, support replies, and promotions with existing screens.
- Remove only the duplicate local reward-unlock notification call; keep local stock-change alerts and in-app reward celebration behavior.
- Query hosted token counts without exposing Expo token values, then document what is proven and what remains manual.

## Prompt

Sen OmaLeima mobile notification reliability engineer olarak calisiyorsun.
Hedef: Mevcut bildirim sistemindeki repo-ici eksikleri tamamla; tum roller icin push token kayit/onboarding yuzeyini tamamla; background push token durumunu guvenli sekilde kontrol et; fiziksel cihaz gerektiren kanitlari remaining gaps dosyasina yaz.
Mimari: Expo Notifications + Supabase `device_tokens` + mevcut Edge Function payloadlari + tek notification response router + role profile settings kartlari + permission-granted auto-registration bridge.
Kapsam: `apps/mobile/src/features/push/*`, `apps/mobile/src/features/notifications/*`, business/club profile settings, `docs/PRODUCTION_REMAINING_GAPS.md`, working docs ve validation. Apple login, Sentry, yeni push provider, scanner flow redesign yok.
Cikti: strict TS/TSX patch, safe token-count proof note, validation, focused commit.
Yasaklar: Expo push token degerlerini loglamak yok, kullanici izni olmadan permission prompt tetiklemek yok, duplicate reward push/local alert yok, Android push kaniti yoksa varmis gibi gostermek yok.
Standartlar: AGENTS.md strict typing, no silent failures, localized UI copy, physical-device proof ile repo-side validation ayrimi net olacak.

## Current Plan (Organizer Live Event Name Lock Parity)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Enforce the "active event name is immutable" rule consistently in both organizer web and mobile, then close the shared organizer parity check with a focused validation pass.

## Organizer Live Event Name Lock Parity Architectural Decisions

- Treat active/live event name immutability as a business rule, not just a UI affordance. Apply it in both update transports/mutations so crafted clients cannot bypass it.
- Mirror the rule in both organizer forms by disabling the name field and showing a short hint when the selected event is already active/live.
- Limit the parity review to shared organizer surfaces that exist on both platforms: home/dashboard shortcuts, events, upcoming, announcements, claims, reports, and profile routing. Do not create new mobile pages for desktop-only operator tools in this slice.

## Prompt

Sen OmaLeima organizer parity engineer olarak calisiyorsun.
Hedef: Aktif/Kaynnissa event adinin web ve mobile organizer tarafinda degistirilememesini garanti et; ortak organizer sayfalari ve butonlari parity acisindan kontrol edip tek anlamli bug olan bu name-lock farkini kapat.
Mimari: web ve mobile event update formunda name alanini disable et, server/mobile mutation katmaninda ACTIVE event icin mevcut ismi koru, shared organizer sayfa rotalarini hizli parity review ile dogrula.
Kapsam: `apps/admin/src/features/club-events/components/club-events-panel.tsx`, `apps/admin/src/features/club-events/event-transport.ts`, `apps/mobile/src/app/club/events.tsx`, `apps/mobile/src/features/club/club-event-mutations.ts`, ilgili working docs ve validation. Yeni sayfa ekleme veya unrelated organizer refactor yok.
Cikti: minimal TS/TSX patch, cross-platform organizer name-lock parity, validation evidence, handoff notu.
Yasaklar: desktop-only surface'lari mobile'a tasimak yok, historical migration rewrite yok, scanner/business flow degistirmek yok, fake parity claim yok.
Standartlar: AGENTS.md focused changes, strict typing, explicit behavior lock, no silent failure.

## Current Plan (Club Event Update Error Cleanup)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Remove the two incorrect organizer event-save failures by normalizing the fixed stamp-limit field and by avoiding invalid legacy published cover URLs in update payloads.

## Club Event Update Error Cleanup Architectural Decisions

- Treat organizer event `perBusinessLimit` as a product constant at mutation time. Since the UI only exposes `1`, save logic should normalize any stale/legacy draft value back to `1` rather than failing on an invisible state mismatch.
- Preserve published cover handling rules, but only send existing cover URLs that still resolve to a real public `event-media` object. If an unchanged legacy cover no longer satisfies the hardened DB rule, clear it during update so the event can still be edited safely.
- Keep the fix inside the mobile mutation layer. No Supabase migration or broader event form redesign is needed for this regression.

## Prompt

Sen OmaLeima mobile mutation hardening engineer olarak calisiyorsun.
Hedef: Organizator mobilde etkinlik guncellerken gorulen iki anlamsiz hatayi kaldir; sabit stamp-limit alanini guvenli sekilde normalize et ve eski/legacy published cover URL'lerinin guncellemeyi bloke etmesini engelle.
Mimari: mevcut club event mutation katmaninda minimal TypeScript degisikligi, verified existing media URL kontrolu, gerekiyorsa invalid legacy URL'yi payload'dan temizleme.
Kapsam: `apps/mobile/src/features/club/club-event-mutations.ts`, ilgili working docs, mobile validation ve handoff. UI form redesign, Supabase migration, scanner/business flow degisikligi yok.
Cikti: minimal TS patch, organizer save akisini toparlayan fix, validation evidence.
Yasaklar: historical migration rewrite yok, calisan media publish akisini bozmak yok, gereksiz refactor yok, fake success yok.
Standartlar: AGENTS.md focused changes, strict typing, explicit error handling, no silent backend hacks.

## Current Plan (Mobile Organizer Edit + Student Header/Rewards UX)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Fix the reported organizer edit-routing bug and the two student mobile touch/layout regressions with minimal, targeted React Native changes.

## Mobile Organizer Edit + Student Header/Rewards UX Architectural Decisions

- Keep the organizer event screen architecture as-is. Fix the bug by preventing the "reset to create" effect from firing while a user-selected edit target is active, rather than introducing a new route or second form screen.
- Keep the rewards hero design unchanged, but give the large count a safer box: slightly more inset and taller line box so iOS glyph rendering cannot crop the number.
- Reuse the shared `StudentProfileHeaderAction` component for the tap reliability fix so all student tabs benefit from the larger hit target consistently.

## Prompt

Sen OmaLeima mobile UX maintenance engineer olarak calisiyorsun.
Hedef: Organizator mobilde secilen appro etkinligi icin gercek edit formunu ac; ogrenci rewards hero sayacindaki clipping'i gider; ogrenci profil butonunun dokunma alanini guvenilir hale getir.
Mimari: mevcut Expo Router / React Native ekran yapisini koru, tekil state-reset bug'ini duzelt, rewards hero typography/container inset'lerini guvenli hale getir, shared profile header CTA hit target'ini buyut.
Kapsam: `apps/mobile/src/app/club/events.tsx`, `apps/mobile/src/app/student/rewards.tsx`, `apps/mobile/src/features/profile/components/student-profile-header-action.tsx`, ilgili working docs, validation ve handoff. Scanner flow, Supabase logic, unrelated refactor yok.
Cikti: minimal TypeScript/TSX patch, kullanici raporundaki 3 mobil problem icin dogrudan duzeltme, validation evidence.
Yasaklar: yeni ekran mimarisi yok, calisan organizer/scanner akislarini bozmak yok, gereksiz stil refactor'u yok, tahmine dayali backend degisikligi yok.
Standartlar: AGENTS.md focused changes, strict typing, no silent failures, existing UI patterns korunacak.

## Current Plan (Role/Security Flow Completion)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Finish remaining repo-fixable production hardening without changing the user-confirmed business owner/staff scanner flow.

## Role/Security Flow Completion Architectural Decisions

- Preserve the current scanner model: owner/manager can issue scanner QR and manage joined events; scanner staff can scan only the selected business/event context.
- Add a shared mobile user-safe error mapper and replace raw query/mutation messages on app role surfaces with localized, non-sensitive fallback copy.
- Keep action semantics the same, but scope loading indicators by item: one joining event card or one reward handoff candidate at a time.
- Use a forward-only Supabase migration for role/search-path hardening. Do not edit historical migrations.
- Remove raw DB/provider error messages from Edge HTTP `details`; log server-side error objects with stable event labels instead.

## Prompt

Sen OmaLeima release security engineer olarak calisiyorsun.
Hedef: Kullanici tarafindan dogrulanmis business owner/staff scanner akisini bozmadan kalan repo-ici guvenlik ve UX aciklarini kapat.
Mimari: read-only subagent bulgulari + shared mobile safe-error mapper + item-scoped pending UI + forward-only Supabase migration + Edge Function response sanitization.
Kapsam: mobile/admin role surfaces, scanner/owner Edge Functions, business event leave RPC, REVIEW/PLAN/TODOS/PROGRESS, validation ve focused commit. Apple/Sentry/store/custom-domain veya scanner flow redesign yok.
Cikti: strict TypeScript/SQL patch, safe localized error copy, role parity migration, sanitized Edge responses, validation evidence.
Yasaklar: calisan QR scan akisini bozmak yok, raw secret/provider error response yok, historical migration rewrite yok, unrelated refactor yok, false production-ready claim yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, forward-only migrations, no silent failures.

## Current Plan (QR Rate Limit Hosted Apply + UX)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Complete the immediate QR follow-up by smoothing the rare rate-limit UX and applying/deploying the Supabase QR limiter to the hosted project where credentials permit.

## QR Rate Limit Hosted Apply + UX Architectural Decisions

- Keep the backend limit unchanged: it is burst-only and already aligned with the QR refresh cadence.
- Add a local screen-level mapper for `QR_RATE_LIMITED` so the active QR screen shows a calm FI/EN retry/catch-up message instead of raw backend text.
- Use Supabase CLI for hosted apply/deploy: apply `20260509170000_qr_token_generation_rate_limit.sql`, deploy `generate-qr-token`, and verify the table/function exists if possible.
- If hosted CLI actions fail because of credentials/network, do not fake success. Record the exact blocker in `PROGRESS.md` and keep the migration/function code committed.

## Prompt

Sen OmaLeima QR release follow-up engineer olarak calisiyorsun.
Hedef: QR rate-limit state'i kullaniciya sakin ve anlasilir gostermek; QR limiter migration'ini hosted Supabase'e uygulamak; `generate-qr-token` Edge Function'i deploy etmek veya uygulanamayan adimlari acik handoff olarak belgelemek.
Mimari: focused mobile error mapper + Supabase CLI hosted migration apply + Edge Function deploy + validation/handoff.
Kapsam: `apps/mobile/src/app/student/active-event.tsx`, QR migration deploy, `generate-qr-token` deploy, REVIEW/PLAN/TODOS/PROGRESS. Apple/Sentry/business-role redesign yok.
Cikti: localized UX patch, hosted apply/deploy evidence or blocker note, validation, focused commit.
Yasaklar: raw provider secrets loglamak yok, false deploy success yok, unrelated refactor yok, destructive DB operation yok.
Standartlar: AGENTS.md explicit errors, strict typing, zero-trust backend, focused changes.

## Current Plan (QR Generation Rate-Limit Tuning)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Replace the generic QR token limiter with a dedicated Supabase QR-generation policy that protects against burst abuse without affecting the normal student refresh loop.

## QR Generation Rate-Limit Tuning Architectural Decisions

- Keep QR protection in Supabase, but separate it from dashboard mutation limits. Add a dedicated rate-event table and a `check_generate_qr_token_rate_limit` function.
- Tune the limiter for burst protection: allow normal 30-45 second refresh behavior plus remount/reconnect wiggle room, but block very fast repeated calls that only happen in buggy loops or abuse scenarios.
- Keep the rate limit scoped to `actor_user_id + event_id` so one active event does not block another and normal event switching is unaffected.
- Reuse the same zero-trust pattern as other RPC-backed protections: `SECURITY DEFINER`, explicit grants only to `service_role`, row-level cleanup inside the function, and structured JSON responses.
- Return the same `QR_RATE_LIMITED` error shape from the Edge Function if the dedicated function reports a block, but choose generous thresholds so normal users should never hit it.

## Prompt

Sen OmaLeima Supabase QR security engineer olarak calisiyorsun.
Hedef: Student QR token uretim akisini bozmadan, dashboard mutation limiter'dan ayri, QR'ye ozel bir Supabase burst-rate-limit politikasi kur ve Edge Function'i buna bagla.
Mimari: forward-only SQL migration + dedicated `qr_token_generation_rate_events` table + `check_generate_qr_token_rate_limit` security-definer RPC + minimal `generate-qr-token` TypeScript update.
Kapsam: QR TTL/refresh ritmine uyumlu limitler, per-user/per-event scope, working-doc updates, validation, focused commit. Mobile UX copy degisikligi veya broader auth/push logic yok.
Cikti: SQL + TypeScript minimal patch, validation evidence, clean focused commit.
Yasaklar: dashboard limiter'i yeniden kullanmak yok, normal QR screen refresh akisini bozmak yok, historical migration rewrite yok, unrelated revert yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, focused changes.

## Current Plan (Production Gap Report + Git Cleanup)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Create a clear remaining production gaps report, clean the accumulated dirty branch into traceable commits, and complete only safe in-repo fixes that do not require Apple/Sentry/provider credentials.

## Production Gap Report + Git Cleanup Architectural Decisions

- Write one durable report file under `docs/` that separates: current readiness decision, code-fixable backlog, and issues that require owner/provider/manual production work.
- Do not implement Sign in with Apple, Sentry, App Store/Play Console setup, Supabase custom-domain activation, or real-device smoke. These need external accounts/devices or explicit provider choices and belong in the report.
- Improve git hygiene without destructive history rewrite: use logical commits on the current feature branch, include forward migration files, exclude generated screenshots/output artifacts via `.gitignore`, and never reset/revert unrelated work.
- Reuse existing Supabase rate-limit infrastructure for any safe backend hardening. Avoid adding new external dependencies or environment variables.
- Validate touched areas with existing commands only: targeted Deno check, admin/mobile typecheck/lint where relevant, Supabase migration/lint if SQL changes are made, and `git diff --check`.

## Prompt

Sen OmaLeima release cleanup ve production-readiness engineer olarak calisiyorsun.
Hedef: Subagent review'da bulunan eksikleri acik bir dosyada listele; buradan yapilamayacak Apple/Sentry/real-device/provider islerini rapora ayir; mevcut dirty branch'i mantikli commit'lerle izlenebilir hale getir; sadece bu ortamda guvenle duzeltilebilen kucuk kod-side blocker'lari uygula.
Mimari: docs-first gap report + forward-only Supabase/Edge hardening + existing validation gates + logical git commits.
Kapsam: `docs/PRODUCTION_REMAINING_GAPS.md`, REVIEW/PLAN/TODOS/PROGRESS handoff, `.gitignore` artifact hygiene, optional QR generation rate limiting, git commit cleanup. Apple login, Sentry integration, hosted custom-domain activation, store submission, destructive git reset yok.
Cikti: Report file, validated code/docs changes, logical commits with required Co-authored-by trailer, clean working tree except intentionally ignored local artifacts.
Yasaklar: history rewrite/reset-hard yok, external provider setup yok, generated screenshots/output commit yok, historical migration rewrite yok, false production-ready claim yok.
Standartlar: AGENTS.md strict workflow, zero-trust backend controls, explicit errors, strict typing, focused changes.

## Current Plan (Final Production Readiness Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Treat the current branch as a release candidate, independently re-run the highest-value validation and rendered/native smoke paths, collect subagent review findings, and fix only concrete production blockers discovered during this pass.

## Final Production Readiness Sweep Architectural Decisions

- Use subagents as read-only parallel reviewers for security/admin mutations, database/RLS/migrations, TypeScript/mobile-web correctness, and QA evidence. The main thread owns command execution, integration, and any file edits.
- Prefer existing project validation scripts and smoke tests. Add or update tests only when a release-critical path has no executable coverage or the existing smoke harness is stale.
- Keep Chrome, Computer, Expo, iOS, and Android evidence truthful: Chrome must follow the extension workflow; Computer is for non-destructive UI inspection; Expo/native scripts prove simulator launch/render, not physical APNs/camera/OAuth/share/photo behavior.
- Avoid destructive hosted actions. Hosted checks should be read-only unless the user has explicitly requested a production deploy/apply step for a specific change.
- Preserve already-applied migrations and unrelated dirty work. Any database correction must be a forward migration; any refactor must stay tightly scoped to a newly verified problem.

## Prompt

Sen OmaLeima final production-readiness lead engineer olarak calisiyorsun.
Hedef: Current release branch'i production oncesi son kez karis karis dogrula; subagent review bulgularini topla; admin web, Expo mobile, Supabase DB/RLS/Edge Functions, Chrome, Computer, iOS ve Android kanitlarini yeniden calistir; yalnizca yeni bulunan release blocker'lari minimal diff ile duzelt.
Mimari: read-only subagent lanes + existing validation commands + Chrome extension workflow retry + Playwright smoke fallback + Computer/iOS/Android simulator inspection + forward-only fixes.
Kapsam: announcement push repeatability/audit/no-target behavior, admin mutation hardening, media staging ownership, FK/search-path migrations, business event detail, support scroll, native login/startup, Vercel/admin panel smoke, working-doc handoff.
Cikti: Validation command evidence, browser/native QA notes, subagent bulgu ozeti, varsa strict TS/TSX/SQL minimal patch, updated handoff.
Yasaklar: false-green test sonucu yok, unrelated dirty revert yok, historical migration rewrite yok, destructive hosted mutation yok, token'i olmayan cihaza push teslim oldu gibi gostermek yok, silent failure yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, structured logging, focused changes, no secret/cookie inspection.

## Current Plan (Full Production Verification Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Use subagents and requested plugin workflows to re-review the production release branch, run validation gates, exercise web/native smoke paths where possible, and fix only high-confidence blockers discovered during the pass.

## Full Production Verification Sweep Architectural Decisions

- Split review into parallel read-only lanes first: security/admin mutations, Supabase DB/RLS/migrations, TypeScript/web/mobile correctness, and QA/native/browser evidence. Main thread owns integration and any final code edits.
- Prefer existing project commands and smoke scripts over adding new tests. Add or adjust tests only if a current release-critical path has no executable coverage or a smoke script has drifted.
- Use Chrome through the extension workflow. If the extension path still fails after retry and local checks, document it and use project Playwright smoke scripts for web evidence without claiming Chrome success.
- Use Computer Use for non-destructive simulator/app inspection only. Use Xcode/adb/Expo scripts for deeper native checks because they provide repeatable logs and artifacts.
- Keep hosted/destructive actions out of this sweep unless a command is read-only or explicitly scoped to temporary smoke data with cleanup.
- Treat physical-device-only flows as externally tested by the user and record them as such, not as local simulator coverage.

## Prompt

Sen OmaLeima production verification lead engineer olarak calisiyorsun.
Hedef: Release branch'i admin web, Expo mobile, Supabase DB/RLS/Edge Functions ve native/browser QA acisindan tekrar incele; subagent bulgularini topla; mevcut testleri calistir; sadece high-confidence release blocker'lari minimal diff ile duzelt.
Mimari: subagent-parallel read-only review + existing validation scripts + Chrome skill retry + Playwright fallback evidence + Computer/iOS/Android simulator smoke + forward-only fixes.
Kapsam: admin mutation security, announcement push repeatability/audit, media staging ownership, FK indexes, business event detail, support scroll, native startup/login, docs/handoff. Production data mutation ve unrelated refactor yok.
Cikti: Validation command evidence, browser/native QA notes, subagent finding summary, minimal TS/TSX/SQL fixes if needed, updated handoff.
Yasaklar: false-green simulator sonucu yok, unrelated dirty revert yok, already-applied migration rewrite yok, token'i olmayan cihaza push gitmis gibi gostermek yok, silent failure yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, structured logging, focused changes, no secret/cookie inspection.

## Current Plan (P2 Durable Push/Media/Index Backlog)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Close the remaining P2 backlog with forward-only Supabase hardening, durable announcement delivery attempts, Chrome admin panel smoke, and `serve-sim` execution evidence.

## P2 Durable Push/Media/Index Architectural Decisions

- Add `announcement_push_delivery_attempts` as the durable send-attempt source of truth. Insert the attempt after recipient/token resolution but before the Expo Push API call; update it after Expo results, no-token completion, or post-send persistence failures.
- Preserve repeatable push semantics. Every send can create a new attempt and new notification rows for currently token-enabled recipients; existing notification history must not block later sends.
- Keep no-token sends non-blocking for the admin UI while still recording a `NO_TARGETS` delivery attempt with skipped counts.
- Add DB helper functions that derive the staging owner UUID from `users/<uuid>/...` and validate that owner against active club editor membership or platform-admin status. Apply those checks inside the existing event/announcement staging triggers.
- Close FK index backlog with a single forward migration using `create index if not exists`; avoid rewriting historical migrations.
- Use Chrome only after the user's approval and avoid inspecting secrets/cookies. If authentication is required, verify public/login and protected-route behavior without forcing destructive or externally visible actions.

## Prompt

Sen OmaLeima Supabase/Edge release hardening engineer olarak calisiyorsun.
Hedef: Announcement push delivery attempt row'unu Expo send oncesi durable yaz; private media staging path sahibini DB'de club editor/platform admin membership ile dogrula; FK index backlog'unu forward migration ile kapat; Chrome admin panel smoke ve `npx serve-sim` kaniti topla.
Mimari: forward-only SQL migration + strict Deno Edge Function attempt lifecycle + local Supabase migration/db lint validation + Chrome approved admin smoke + serve-sim command probe.
Kapsam: `send-announcement-push`, Supabase migrations, working docs, local validation, admin smoke. Hosted deploy, destructive hosted mutation, store submission ve real production push send yok.
Cikti: Strict SQL/TypeScript patch, validation command evidence, Chrome/serve-sim result, updated handoff.
Yasaklar: push token'i olmayan cihaza teslim oldu gibi gostermek yok, Expo send oncesi attempt insert basarisizsa send yapmak yok, historical migration rewrite yok, silent failure yok, unrelated dirty revert yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, structured metadata, focused minimal changes.

## Current Plan (Production Hardening Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Continue broad release-candidate review with concrete hardening fixes, rendered admin QA, native simulator checks, and subagent-assisted code review.

## Production Hardening Sweep Architectural Decisions

- Split implementation by ownership to avoid conflicts: media publish hardening, dashboard mutation CSRF guard, read-only security/database review, and rendered/native QA run independently.
- Keep hosted/destructive actions out of scope unless explicitly confirmed. Local Supabase migrations and local admin/mobile builds are allowed.
- Prefer existing project smoke scripts and package commands before adding new tests. Add or update tests only when an existing regression harness is stale or missing for changed behavior.
- Use Browser/Chrome as requested, but if Chrome extension communication fails after the skill-mandated checks, document the plugin blocker and use Playwright/Computer/Xcode/adb for local evidence.
- Treat physical-device-only flows as residual risk, not as simulator-proven: push delivery/tap, camera QR, Google native OAuth callback, share/save sheets, and Photos permissions.

## Prompt

Sen OmaLeima production hardening lead engineer olarak calisiyorsun.
Hedef: Admin web, mobile/native, Supabase DB/RPC/Edge Functions ve release QA gate'lerini karis karis incele; code-review bulgularindan high-confidence blocker'lari duzelt; testleri ve simulator/browser evidence'i calistir.
Mimari: subagent-parallel review + scoped implementation ownership + local Supabase forward migrations + admin/mobile validation gates + Browser/Chrome/Computer/iOS/Android simulator QA.
Kapsam: published media hardening, dashboard mutation CSRF guard, native/browser smoke, existing smoke/audit tests, working docs/handoff. Hosted deploy, production push send, store submission ve destructive hosted data mutation yok.
Cikti: Strict TS/TSX/SQL patch, validation command evidence, simulator/browser QA notes, remaining production risk list.
Yasaklar: unrelated dirty revert yok, false-green simulator sonucu yok, secrets/cookies/session stores inspect etmek yok, public/disruptive actions without confirmation yok, broad rewrite yok.
Standartlar: AGENTS.md zero-trust, explicit errors, structured logging, strict typing, focused minimal changes, no silent failures.

## Current Plan (Production Code Review + Refactor Sweep)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Verify the last three requested slices with production-level review, run broad validation, exercise browser/native smoke paths where available, and fix high-confidence blockers found during review.

## Production Code Review + Refactor Sweep Architectural Decisions

- Treat already-applied migration files as migration history, not mutable scratch files. New DB behavior changes must go into a forward migration, while the untracked historical files must be preserved for git parity.
- Keep the new business event detail route and support modal architecture. Fix correctness and native layout risks without redesigning those surfaces.
- Use React Query mutation error state for user-visible request failures, but catch async press-handler rejections so native does not redbox.
- Make `join_business_event_atomic` conflict-idempotent with `ON CONFLICT DO NOTHING` plus locked existing-row handling. This preserves clear statuses (`SUCCESS`, `ALREADY_JOINED`, `VENUE_REMOVED`) and avoids raw unique-constraint leaks under double taps.
- Revoke default execution grants on new helper functions in a separate hardening migration.

## Prompt

Sen production release code-review ve refactor engineer olarak calisiyorsun.
Hedef: Son uc promptaki degisikliklerin gercekten dogru calistigini kanitla; web/mobile/Supabase/native validation calistir; subagent bulgularini topla; high-confidence release blocker'lari minimal diff ile duzelt.
Mimari: evidence-first review + requested plugin/tool smoke + focused TSX fixes + forward-only Supabase migration hardening + working-doc handoff.
Kapsam: support history scroll, business event detail, repeatable announcement push, city-scoped business join RPC, validation docs. Unrelated dirty dosyalari revert etme.
Cikti: Strict TSX/SQL patch, validation command evidence, browser/native smoke notes, subagent bulgu ozeti.
Yasaklar: false-green test sonucu yok, uygulanmis migration dosyasini sessizce rewrite etmek yok, token'i olmayan cihaza push gitmis gibi gostermek yok, catch-all silent failure yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, focused changes, no unrelated revert.

## Current Plan (Business Event Detail + Repeatable Announcement Push)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make support history visibly self-scrolling, allow repeated announcement push sends, avoid no-device-token hard failures, and open business event cards into a real detail screen instead of a popup.

## Business Event Detail + Repeatable Announcement Push Architectural Decisions

- Keep support requests in the existing modal architecture. The fix is to make the bounded history `ScrollView` visibly scrollable and nested-scroll friendly, not to redesign support.
- Keep push delivery truthful: enabled device tokens are still required for remote phone notifications, including when the user is outside the app. The send operation should skip users without enabled tokens and return a successful zero-target result when nobody is currently push-targetable.
- Remove repeat-send blocking in `send-announcement-push`. Existing notification rows remain as audit/delivery history, and each button press creates a new delivery attempt for all currently resolved, preference-enabled, token-enabled recipients.
- Update admin push availability so `SENT` no longer disables the button. `PARTIAL` and `FAILED` remain useful status hints, but all active published announcements can be pushed again.
- Add `/business/event-detail` as a hidden tab route. It should resolve event data from the existing business overview query, show event timing, description, venue/business context, scanner/history actions, join/leave where applicable, and no modal popup.
- Route business event cards from `home` and `events` to the detail page with explicit `eventId` and `businessId` params. Keep scanner/history buttons as separate direct actions.

## Prompt

Sen Expo mobile ve Supabase Edge Function release engineer olarak calisiyorsun.
Hedef: Tuki/support gecmisinde cok mesaj oldugunda liste kendi icinde scroll oldugunu belirginlestir; announcement push'u tekrar tekrar gonderilebilir yap; token'i olmayan kullanicilar yuzunden tum push istegini hata gibi gostermeyi birak; isletme event kartlarini popup yerine detay sayfasina ac.
Mimari: bounded support history ScrollView polish + send-announcement-push repeatable delivery semantics + admin push availability update + hidden Expo Router business detail route + existing business overview query reuse.
Kapsam: mobile support sheet, mobile business home/events/detail surfaces, admin announcement panel, announcement Edge Function, working docs, validation. Native APNs/FCM provider setup bu slice'ta degismez.
Cikti: Strict TS/TSX/Deno patch, mobile/admin/function validation, acik push-token davranisi notu.
Yasaklar: token'i olmayan cihaza push gitmis gibi gostermek yok, onceki notification audit kayitlarini silmek yok, business event join/leave yetki kurallarini UI-only yapmak yok, unrelated dirty revert yok.
Standartlar: AGENTS.md explicit errors, strict typing, no silent failures, focused minimal diff, user-facing FI/EN copy.

## Current Plan (Club Event Cancel Confirm + Announcement Acknowledgement)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Add localized destructive confirmation for club event cancellation and move announcement acknowledgement writes behind an atomic Supabase RPC so the student popup does not redbox on RLS failures.

## Club Event Cancel Confirm + Announcement Acknowledgement Architectural Decisions

- Add confirmation at every direct event-cancel button, not only delete. Web can use the existing lightweight `window.confirm` pattern already used by announcements/login slides; mobile should use `Alert.alert` like the existing event delete confirmation.
- Keep cancel and delete semantics separate. Cancel preserves operational history and hides the event from active views; delete remains permanent only for drafts.
- Add `acknowledge_announcement_atomic(p_announcement_id uuid)` as a SECURITY DEFINER RPC. It must derive the user from `auth.uid()`, verify `public.can_read_announcement`, and upsert the acknowledgement idempotently.
- Keep mobile query invalidation keyed by the known session user id, but do not trust a user id parameter for the DB write.
- Popup close should never produce an uncaught promise. If acknowledgement fails, log a structured warning and dismiss only the local popup instance so the app remains usable; feed/detail screens continue exposing retriable errors.

## Prompt

Sen Supabase RLS ve Expo/Next.js UX hardening engineer olarak calisiyorsun.
Hedef: Organizer club event cancel aksiyonlari icin FI/EN onay popup'i ekle; student announcement `Selvä/Got it` acknowledgement RLS redbox'unu atomik RPC ve popup error handling ile kapat; Apple login gereksinimini resmi kaynaklara dayanarak netlestir.
Mimari: Web `window.confirm` guard + mobile `Alert.alert` guard + SECURITY DEFINER RPC + mobile mutation transport update + hosted migration verification.
Kapsam: club event cancel buttons, announcement acknowledgement DB/mobile flow, working docs, validation. Apple login implementasyonu bu slice'ta sadece karar/gereksinim analizi olarak kalir.
Cikti: Strict TS/TSX/SQL patch, hosted migration apply proof, admin/mobile validation, Apple login notlari.
Yasaklar: Cancel'i delete ile birlestirmek yok, client-supplied user id ile DB yazmak yok, popup redbox yok, unrelated dirty revert yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, localized user-facing copy.

## Current Plan (Native Simulator Completion + Login Sheet Fix)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Complete the remaining feasible validation, fix Android login sheet visibility, apply the city-scope migration to hosted Supabase, and capture browser/computer/native simulator evidence.

## Native Simulator Completion + Login Sheet Architectural Decisions

- Keep login controls in one vertical flow on mobile. The language selector is a full-width row component, so it must not be placed as a sibling inside a horizontal title row.
- Preserve the current student/business mode split and legal-consent gate. The fix is layout-only, not an auth-policy change.
- Centralize mobile storage behind a platform adapter. Native keeps SecureStore; web export uses browser localStorage so Browser smoke can validate login without loading native-only SecureStore methods.
- Keep iOS simulator smoke deterministic by terminating/uninstalling the previous app before install and building with signing enabled so keychain-backed storage is not tested in an entitlement-less app.
- Apply the city-scope migration to hosted Supabase with the Supabase migration tool/API so production and local behavior match.
- Re-run Android native smoke after the login layout patch and inspect the UI tree/screenshot. Re-run iOS smoke with clean build cache; if simulator tooling still stalls, record the exact gate instead of claiming false green.
- Use Browser for mobile-web rendering only. Use Computer/Xcode/adb for native simulator surfaces. Treat SimCam as a documented future QR camera automation path unless it is already installed.

## Prompt

Sen Expo mobile QA, Supabase migration ve native simulator engineer olarak calisiyorsun.
Hedef: Android login ekraninda slider disinda auth kontrollerinin gorunmemesine neden olan layout regresyonunu duzelt; city scope migration'ini hosted Supabase'e uygula; Browser/Computer/Android/iOS simulator araclariyla mumkun olan smoke kanitini topla; SimCam/serve-sim sinirlarini dogru raporla.
Mimari: minimal login layout patch + hosted migration apply + native smoke runner + Browser mobile-web visual check + Computer Use simulator inspection.
Kapsam: mobile login layout, working docs/handoff, hosted migration apply, validation commands and simulator/browser artifacts. SimCam kurulumu ve DNS custom-domain aktivasyonu bu slice disinda.
Cikti: Strict TSX/doc patch, hosted migration proof, Android/iOS smoke evidence, Browser/Computer evidence, kalan real-device/SimCam notlari.
Yasaklar: auth flow'u yeniden tasarlama yok, false-green simulator sonucu yok, newly downloaded GUI app install/run yok, unrelated dirty revert yok.
Standartlar: AGENTS.md, explicit errors, no silent failures, focused minimal diff, real evidence over assumptions.

## Current Plan (City Scope + Runtime Warning + Simulator QA)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make city-scoped event discovery/eligibility consistent, remove reported mobile runtime warnings/regressions, document Supabase custom-domain requirements, and verify with local browser/native smoke where possible.

## City Scope + Runtime Warning + Simulator QA Architectural Decisions

- Use city as a soft discovery priority for students and a hard eligibility boundary for businesses and organizers.
- Student discovery will keep all public/upcoming events visible, but order the student's primary department-tag city first so local events are the default experience without hiding travel-worthy events.
- Business join eligibility is enforced in `join_business_event_atomic` with normalized city comparison. Mobile/web copy must expose a first-class `EVENT_CITY_MISMATCH` status instead of a generic error.
- Organizer event creation is enforced in `create_club_event_atomic`: the event city must match the active club city for organizer-owned creates. Existing update paths will reject changing the city away from the event's club city.
- Announcement feed freshness should not open a broad realtime channel that can error repeatedly. Use bounded polling/refetch for in-app state, while remote/offline delivery remains Expo push based.
- For Supabase URL branding, do not proxy storage/auth casually through Cloudflare. The correct path is Supabase Custom Domains, then update `NEXT_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_URL` to the branded API hostname.

## Prompt

Sen Expo, Supabase ve release-QA engineer olarak calisiyorsun.
Hedef: Ogrenci event kesfinde sehir onceligini ekle; isletme ve organizator event uygunlugunu DB/API seviyesinde sehirle sinirla; profile navigation ve announcement realtime warning sorunlarini duzelt; Supabase custom domain gereksinimini dokumante et; Browser/native simulator smoke ile dogrula.
Mimari: Supabase atomic RPC/trigger-level invariant + mobile read-model sort + explicit mutation status mapping + polling-based announcement invalidation + release docs.
Kapsam: mobile student/business/organizer event surfaces, admin organizer event API/transport, Supabase migration, working docs, validation and simulator smoke. Production DNS activation is documented but not performed from code.
Cikti: Strict TS/SQL patch, local migration validation, mobile/admin checks, simulator/browser evidence.
Yasaklar: UI-only authorization, broad noisy realtime fallback, hiding other-city student events completely, Cloudflare proxy-as-storage workaround, unrelated dirty revert yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, no silent failures, repeatable smoke tests.

## Current Plan (Private Media Staging + Mobile Edge Protection)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Implement a private staging bucket with signed preview URLs and publish-time public copy for event/announcement media, then document/enforce the practical mobile security boundary around Cloudflare.

## Private Media Staging + Mobile Edge Protection Architectural Decisions

- Add a private `media-staging` bucket with user-owned paths under `users/<auth.uid>/...`; only the owner can read/write/delete staging objects.
- Add `events.cover_image_staging_path` and `announcements.image_staging_path`. Draft rows may keep private staging paths, but non-draft rows must clear staging paths and use final public URLs.
- Upload surfaces write only to `media-staging` first and receive a short-lived signed URL for preview. They no longer create public objects just because a file picker was used.
- Save/publish flows publish staging media by downloading the private object, uploading it to the correct public bucket path, verifying the public URL, clearing the staging path, and deleting the private staging object.
- Draft save stores private staging path and no public URL. Published/active save stores public URL and clears private staging path.
- Cloudflare cannot directly protect mobile-to-Supabase traffic unless the mobile API base is proxied through Cloudflare Worker/API Gateway. For this slice, record the boundary and add an audit/runbook guard so we do not falsely claim web WAF coverage for native clients.

## Prompt

Sen Supabase storage security, Next.js dashboard ve Expo mobile release engineer olarak calisiyorsun.
Hedef: Event ve announcement media icin private staging bucket + signed preview URL + publish-time public copy lifecycle'ini uygula; draft public orphan riskini kapat; mobile Cloudflare korumasinin gercek sinirlarini belgeleyip release audit'e ekle.
Mimari: private Supabase storage bucket + RLS policies + staging path DB columns + signed preview URL read-model + publish helper + web/mobile upload/mutation updates + release audit/doc guard.
Kapsam: event/announcement media upload ve save/publish akislari, Supabase migration, admin/mobile validation, Cloudflare mobile security documentation/audit. Business/logo/login-slide media bu slice disinda kalir.
Cikti: Strict SQL/TS/TSX patch, hosted migration apply/verification, type/lint/build/audit validation, code-review bulgulari.
Yasaklar: public draft URL veya public upload-on-pick yok, native app icine gizli Cloudflare token koymak yok, RLS-only cozum yok, unrelated dirty revert yok.
Standartlar: AGENTS.md zero-trust, Codex Security fix workflow, explicit errors, no silent failures, tenant isolation.

## Private Media Staging + Mobile Edge Protection Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:web-bundle-budget`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- Apply `supabase/migrations/20260508103000_private_media_staging.sql` to hosted Supabase.
- Verify hosted `media-staging` bucket is private, staging columns exist, storage policies exist, and guard triggers/functions exist.
- `git --no-pager diff --check`

## Current Plan (Public Draft Media Guard)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Prevent draft events and announcements from storing public Supabase Storage media URLs, while preserving published media flows and cleanup behavior.

## Public Draft Media Guard Architectural Decisions

- Add a Postgres helper and write triggers that reject public OmaLeima storage URLs on `events.status = 'DRAFT'` and `announcements.status = 'DRAFT'`.
- Backfill existing draft rows by clearing public event/announcement media URLs before enabling the triggers.
- Replace `create_club_event_atomic` so its initial draft insert never stores a public cover URL even if a stale client sends one.
- Web admin/organizer forms should block public media uploads while the record is still draft because the browser can avoid creating the public object in the first place.
- Mobile keeps its existing picker/upload UX, but draft saves persist `null` media and delete newly uploaded public objects after a successful draft save/update.
- This slice is a release guard, not the full private-staging implementation. Draft media preview persistence can be added later with a private bucket plus publish-time public copy.

## Prompt

Sen Supabase/Postgres storage security engineer ve Expo/Next.js release-hardening engineer olarak calisiyorsun.
Hedef: Draft event ve announcement kayitlarinda public storage URL saklanmasini DB seviyesinde engelle; web upload akisini draft durumunda blokla; mobil draft save/update sirasinda public URL'yi persist etmeyip yuklenen objeyi temizle.
Mimari: Postgres trigger guard + focused create RPC replacement + admin validation/UI guard + mobile mutation persistence/cleanup adjustments.
Kapsam: event/announcement media persistence, Supabase migration, working docs, validation. Full private staging bucket ve publish-copy preview sistemi bu slice disinda.
Cikti: Strict SQL/TS/TSX patch, validation komutlari ve kalan private-staging notu.
Yasaklar: RLS-only cozum yok, public draft URL persist yok, published media flow'unu bozmak yok, unrelated dirty revert yok.
Standartlar: AGENTS.md zero trust, explicit errors, no silent failures, cleanup on media replacement.

## Current Plan (Executable Native Simulator Smoke)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Add and run a repeatable Android emulator + iOS simulator launch-smoke script so production readiness no longer depends only on wiring audits.

## Executable Native Simulator Smoke Architectural Decisions

- Keep the existing `audit:native-simulator-smoke` as a fast static gate, but require it to detect the executable smoke script and docs.
- Add `smoke:native-simulators` as the explicit heavy command. It may build release artifacts, boot emulators/simulators, install the app, launch it, capture screenshots/logs, and fail on startup crash markers.
- Android smoke uses the local SDK `adb`/`emulator`, builds `:app:assembleRelease`, installs the APK, launches `.MainActivity`, checks the crash buffer, verifies the app process, dumps UI, and asserts expected startup markers.
- iOS smoke uses `xcodebuild` Release simulator build, `simctl install`, `simctl launch`, process inspection, recent log inspection, and screenshot capture.
- Treat this as simulator proof only. Physical camera, push delivery, Photos/gallery save, share sheet, notification tap, and OAuth final proof remain in `docs/PRODUCTION_TEST_CHECKLIST.md`.

## Prompt

Sen Expo native QA automation engineer olarak calisiyorsun.
Hedef: Android emulator ve iOS simulator icin repeatable release launch smoke komutu ekle; mevcut wiring audit'i bu komutu zorunlu kaynak olarak tanisin; docs/checklist bu gercek smoke'u production oncesi gate olarak kullansin.
Mimari: Node mjs smoke runner + package script + static audit guard + testing/runbook/checklist docs + local simulator execution.
Kapsam: mobile scripts/package docs, working docs, Android/iOS simulator launch validation. Public media bucket mimari degisikligi bu slice disinda kalir.
Cikti: Strict JS/doc patch, Android/iOS smoke artifacts, validation raporu.
Yasaklar: remote push delivery kanitlandi demek yok, simulator'u fiziksel cihaz yerine saymak yok, unrelated dirty revert yok, destructive DB mutation yok.
Standartlar: AGENTS.md, explicit errors, no silent failures, repeatable release-readiness evidence.

## Current Plan (Native Simulator QA Gate Consolidation)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Promote the executable Android/iOS simulator launch smoke into the root mobile native simulator QA command so production preflight cannot stop at wiring-only evidence.

## Native Simulator QA Gate Consolidation Architectural Decisions

- Keep `apps/mobile/scripts/smoke-native-simulators.mjs` as the single implementation of heavy Android/iOS build-install-launch smoke.
- Append `npm --prefix apps/mobile run smoke:native-simulators` to `tests/run-mobile-native-simulator-smoke.mjs` after fast static checks. This preserves early failure on lint/type/export issues before paying the native build cost.
- Keep the direct package script available for repeated targeted runs.
- Update docs/checklist so `qa:mobile-native-simulator-smoke` is understood as the full pre-device gate, while physical-device push/camera/share/OAuth checks remain separate.

## Prompt

Sen mobile release QA gate engineer olarak calisiyorsun.
Hedef: Repo root `qa:mobile-native-simulator-smoke` komutunu wiring-only olmaktan cikarip executable Android/iOS simulator launch smoke'u da kosacak hale getir.
Mimari: root Node QA wrapper + existing mobile smoke script reuse + testing/runbook/checklist doc alignment.
Kapsam: `tests/run-mobile-native-simulator-smoke.mjs`, production testing docs, working docs ve validation. Native smoke implementation'ini yeniden yazma yok.
Cikti: Minimal JS/doc patch ve gecen Android/iOS simulator QA run output'u.
Yasaklar: simulator sonucunu fiziksel cihaz push/camera/OAuth kaniti gibi sunmak yok, duplicate smoke implementation yok, unrelated dirty revert yok.
Standartlar: AGENTS.md, explicit command failures, repeatable release gate.

## Current Plan (Mobile Stale Build Enforcement)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Add server-controlled mobile minimum version/build requirements and block stale standalone builds before users reach scanner/event flows.

## Mobile Stale Build Enforcement Architectural Decisions

- Add `mobile_release_requirements` in Supabase with one row per platform. It is publicly readable because the mobile app must check it before login; only platform admins can manage it.
- Set current minimums to `1.0.0` build `1` and `is_blocking=false` initially, so production behavior does not unexpectedly block current testers. The switch can be turned on later by updating hosted rows.
- Use Expo Constants to read current app version and native build number. Only `ExecutionEnvironment.Standalone` is blocked; dev clients stay usable for testing.
- Fail closed for standalone release builds when the version requirement cannot be verified, because scanner/event flows require server connectivity anyway.
- Do not add an offline scan queue in this slice. Keep event-day offline behavior as manual fallback in the launch runbook to avoid weakening QR token freshness and atomic scan guarantees.

## Prompt

Sen Expo release-safety engineer olarak calisiyorsun.
Hedef: Mobile app icin server-controlled minimum supported version/build gate ekle; stale standalone build'leri app acilisinda blokla; existing manual fallback runbook'u offline scanner queue alternatifi olarak netlestir.
Mimari: Supabase public-read config table + Expo Constants version/build reader + React Query powered ReleaseGateProvider + store readiness audit guard + hosted migration apply.
Kapsam: Supabase migration, mobile release gate feature/provider, Expo config build numbers/store URLs, production checklist/audit/docs, validation.
Cikti: Strict TS/SQL patch, hosted DB verification, `REVIEW_RESULT.md` P1-8 update.
Yasaklar: offline queued stamp write yok, dev-client testlerini bloklamak yok, silent fail-open release verification yok, unrelated dirty revert yok.
Standartlar: AGENTS.md, explicit errors, release-gate evidence, scanner QR integrity.

## Current Plan (Production Test Checklist + Performance Gates)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Create a single production test checklist and close the high-value performance review item with bounded event reads, batched push recipient DB queries, and a web bundle budget audit.

## Production Test Checklist + Performance Gate Architectural Decisions

- Add `docs/PRODUCTION_TEST_CHECKLIST.md` as the single final pre-production manual test source. Keep it role-based and checkbox-driven so two-phone testing can be repeated before App Store / Google Play / web cutover.
- Bound student public event discovery with an explicit DB `end_at >= now` filter and `limit`, while still fetching the student's registered event ids separately so already-registered relevant events are not hidden.
- Batch Supabase `.in(...)` lookups in `send-announcement-push` for large arrays. Keep chunk size explicit and small enough for PostgREST URL/query limits.
- Add a mobile web export budget audit script that reads exported JS assets and fails on oversized total or entry chunks. This is a release gate, not a bundle optimizer.
- Do not claim public media policy fully fixed in this slice. Document the correct strategy: private staging bucket plus publish-time public copy or signed URLs.

## Prompt

Sen release performance ve QA gate engineer olarak calisiyorsun.
Hedef: Production oncesi tum manuel testleri tek dosyada topla; public event listelerini bounded yap; announcement push recipient DB sorgularini batch'le; mobile web bundle budget audit ekle.
Mimari: docs checklist + focused mobile query limit + Deno Edge Function chunk helpers + node audit script + package script wiring.
Kapsam: `docs/PRODUCTION_TEST_CHECKLIST.md`, mobile student event read model, `send-announcement-push`, mobile package script, working docs ve validation.
Cikti: Strict TS/TS/Node patch, `REVIEW_RESULT.md` checklist update, validation raporu.
Yasaklar: public media riskini RLS-only patch ile cozuldu diye isaretleme, registered student events'i yanlislikla saklama, unbounded `.in(...)` sorgularini koruma, unrelated dirty change revert yok.
Standartlar: AGENTS.md, explicit errors, no silent failures, bounded queries, production-ready QA checklist.

## Current Plan (Mutation Rate Limit + Scanner PIN Lockout)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Add distributed authenticated mutation throttling for admin/organizer web routes and atomic scanner PIN lockout for business scanner devices.

## Mutation Rate Limit + Scanner PIN Lockout Architectural Decisions

- Add a small Postgres-backed mutation event table plus `check_dashboard_mutation_rate_limit` RPC. Route handlers call it through service-role after authenticated access is resolved and before expensive writes/pushes.
- Use scope strings per mutation family so one noisy action does not block every dashboard action globally, while still preventing rapid spam of the same high-risk write.
- Keep the route helper explicit and typed. It returns a `NextResponse` only when blocked; otherwise route logic continues normally.
- Extend `business_scanner_devices` with failed PIN attempt metadata and enforce the lock inside `scan_stamp_atomic` before QR token use or stamp creation.
- Lock a device for 10 minutes after 5 wrong PIN attempts, reset counters on a successful PIN, and return a first-class `SCANNER_PIN_LOCKED` status.

## Prompt

Sen Supabase/Postgres security engineer ve Next.js route-hardening engineer olarak calisiyorsun.
Hedef: Admin/organizer mutation endpoint'lerine distributed per-user/per-scope rate limit ekle; business scanner PIN brute-force denemelerini atomik RPC seviyesinde sayip cihaz lockout uygula.
Mimari: Postgres event table + SECURITY DEFINER RPC + service-role route helper + focused route guards + `scan_stamp_atomic` replacement migration + mobile/Edge status mapping.
Kapsam: Supabase migration, admin route helper ve mutation route wiring, scan Edge Function status copy, mobile scanner status/copy, working docs ve validation.
Cikti: Strict TS/SQL patch, `REVIEW_RESULT.md` checklist update, validation raporu.
Yasaklar: in-memory only rate limit yok, QR token'i PIN lock durumunda yakmak yok, catch-all silent fallback yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md zero-trust, atomic RPC, explicit errors, strict typing.

## Current Plan (Production Review Result Closure)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Close the first safe batch of `REVIEW_RESULT.md` blockers and keep the report checklist accurate.

## Production Review Result Closure Architectural Decisions

- Prefer fixing stale audit contracts when source code is intentionally safer than the old audit marker. The audit must still reject top-level `expo-audio` imports.
- Keep mobile accessibility fixes style-only: increase touch target dimensions without altering flow or copy.
- Restore visible web focus outlines instead of relying on hover-only or invisible focus states.
- Remove production Supabase project ref defaults from scripts. Hosted mutations must always receive their target explicitly.
- Make destructive showcase reset require explicit confirmation, with a second confirmation for the known hosted production project.
- Guard local seed from real-user databases without blocking normal local reset of test-only data.

## Prompt

Sen release-readiness closure engineer olarak calisiyorsun.
Hedef: `REVIEW_RESULT.md` icindeki ilk uygulanabilir blocker/high/medium maddeleri sirayla kapat, kapattiklarini checklist'te isaretle ve validation komutlariyla kanitla.
Mimari: stale audit contract update + focused UI accessibility style fixes + destructive script environment guards + seed safety guard + working-doc updates.
Kapsam: mobile audit scripts, mobile accessibility styles, admin global focus styles, admin destructive scripts, Supabase seed guard, review/todo/progress docs. Apple login, physical-device smoke, rate limit ve PIN lockout bu slice'in disinda sonraki slice'a kalir.
Cikti: Strict TS/TSX/CSS/SQL patch, `REVIEW_RESULT.md` checkbox progress, validation raporu.
Yasaklar: unrelated dirty change revert yok, production deploy yok, real user data mutation yok, stale native build crash riskini geri getiren top-level `expo-audio` import yok.
Standartlar: AGENTS.md, explicit errors, no silent failures, release gate evidence.

## Current Plan (Student Event Detail Debug Rules + Announcement Push Tap)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Hide non-user-facing event rule metadata from student event detail and verify that announcement pushes sent from admin/organizer surfaces can route mobile users to the correct announcement detail.

## Student Event Detail Debug Rules + Announcement Push Tap Architectural Decisions

- Keep event rules flexible in the database, but filter known technical keys at render time on the student-facing detail screen.
- Do not delete historical event `rules` data just to hide debug metadata; this is presentation-layer cleanup.
- Since dark mode is now fixed, remove light-mode style branches from this screen instead of keeping dead conditionals.
- Verify push by following the full chain: admin route -> transport -> Edge Function -> Expo push payload -> mobile notification response bridge -> role-specific announcement detail route.
- Avoid sending real hosted pushes during terminal validation; use repo audits/static evidence and reserve real delivery/tap proof for physical-device smoke.

## Prompt

Sen Expo mobile UI ve push-notification QA engineer olarak calisiyorsun.
Hedef: Student event detail ekraninda `screenshotMode true` gibi teknik rule alanlari gorunmesin; ekran dark-only moda uygun olsun; admin/organizer duyuru push zincirinin app kapaliyken bildirime tiklama ile hedef announcement detayina yonlenmeye hazir oldugunu dogrula.
Mimari: render-time rule filtering + dark-only style cleanup + Edge Function/payload/router static verification + existing audit commands.
Kapsam: student event detail screen, UI preferences cleanup, working docs ve validation. Production user token'larina test push gonderme yok.
Cikti: Strict TSX patch, push verification summary, validation raporu.
Yasaklar: raw technical metadata UI yok, light-mode branch yok, gercek kullanicilara izinsiz push test yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, explicit validation, physical-device limits honest reporting.

## Current Plan (Stamp Card Cap + Empty Leima Reset)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make department tag creation resilient to hidden duplicate slugs, enforce full event stamp cards at the database scan boundary, and reset hosted leima progress to zero for fresh testing.

## Stamp Card Cap + Empty Leima Reset Architectural Decisions

- Keep duplicate tag recovery client-side and explicit: attach a visible active/merged duplicate when possible; if the colliding slug cannot be loaded or is not attachable, retry creation with a deterministic suffixed slug.
- Enforce the event total stamp cap in `scan_stamp_atomic` before QR token consumption and stamp insertion. `events.minimum_stamps_required` remains the visible `x/x` card size and completion threshold, and now also blocks further scans once reached.
- Return a first-class `STAMP_CARD_FULL` status from the RPC so the Edge Function and business scanner can show actionable localized copy instead of treating it as a generic result.
- Apply the new RPC to hosted Supabase with the linked Supabase CLI because local Docker is currently unavailable and the user approved production Supabase writes.
- Clear progress-like hosted data (`stamps`, QR token uses, leaderboard rows, reward claims, completed registration markers, reward inventory claimed counters, reward unlock notifications) while preserving users, events, venues, businesses, organizers, and registrations.

## Stamp Card Cap + Empty Leima Reset Edge Cases

- A duplicate department tag slug may exist in a status the student cannot attach. Retrying with a suffix avoids silently attaching blocked/pending rows.
- A merged duplicate slug should attach the active merge target if visible.
- A full stamp card must not consume the submitted QR JTI; otherwise a rejected 4th scan would also burn the student's QR unnecessarily.
- A card with `minimum_stamps_required <= 0` should not be capped by this rule.
- Clearing hosted leimas should also clear derived progress state so screenshots/tests do not show stale leaderboard/reward completion.

## Prompt

Sen Supabase/Postgres QR integrity engineer ve Expo mobile runtime engineer olarak calisiyorsun.
Hedef: Student profile custom department tag duplicate slug redbox'ini retry/attach davranisiyla kapat; `3/3` dolu event kartinda 4. leima yazilmasini atomik DB seviyesinde engelle; hosted Supabase'teki tum kullanici leima/progress verisini temizle.
Mimari: focused TS helper retry + Postgres SECURITY DEFINER RPC replacement + typed Edge Function/mobile status mapping + hosted Supabase linked query execution.
Kapsam: mobile student profile helper, scan RPC migration, scan Edge Function response map, business scanner transport/UI copy, hosted leima reset SQL, working docs ve validation.
Cikti: Strict TS/SQL patch, hosted apply/reset verification counts, validation raporu.
Yasaklar: UI-only scan cap yok, QR token'i full-card durumda yakmak yok, `any` yok, Docker/local DB blokaj saymak yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, zero trust/RLS, explicit errors, atomic RPC, focused validation.

## Stamp Card Cap + Empty Leima Reset Validation Plan

- `npx --yes supabase@2.98.2 db query --linked --file supabase/migrations/20260507222000_scan_stamp_card_full_limit.sql --output json`
- Hosted Supabase leima/progress reset count verification.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `git --no-pager diff --check`

## Current Plan (Mobile Runtime Recovery + Expanded Demo Accounts)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Stop the reported mobile redboxes, make custom department tag creation idempotent, expand hosted test/demo event assignments, and guarantee a default OmaLeima logo for every business.

## Mobile Runtime Recovery + Expanded Demo Accounts Architectural Decisions

- For custom department tags, keep client-side UX but make duplicate slug recovery explicit: on `23505`, load the existing active/merged target by slug and attach it instead of throwing.
- For scan audio, check `requireOptionalNativeModule("ExpoAudio")` before loading `expo-audio`; if the native module is missing, return `null` and keep haptic-only feedback.
- For stale Auth refresh tokens, wrap `getSession()` in `try/catch` and clear only the local auth session when the error is an invalid/missing refresh token.
- For default business logos, enforce the rule in Postgres with a trigger and backfill existing `businesses.logo_url` null/blank values.
- For demo coverage, extend the repeatable hosted seed to 5 events, 30 venue links, all existing active students registered into every demo event, and the existing scanner business joined across the set.

## Mobile Runtime Recovery + Expanded Demo Accounts Edge Cases

- A duplicate department tag may point to a merged tag. In that case, attach the active merge target when available.
- A blocked/pending tag with the same slug must not be silently attached; it should fail clearly.
- Old native builds should not load `expo-audio` at all when `ExpoAudio` is absent.
- Clearing a stale refresh token must not call a remote sign-out that depends on the invalid token.
- Businesses can still override the default logo by saving any non-empty custom logo URL.

## Prompt

Sen Expo runtime-stability, Supabase auth/session ve Postgres demo-data engineer olarak calisiyorsun.
Hedef: Student profile custom department tag duplicate slug redbox'ini idempotent attach davranisina cevir; stale refresh token redbox'ini local session cleanup ile kapat; `ExpoAudio` olmayan eski native build'de audio package'i hic yukleme; hosted demo event/account coverage'ini genislet; tum business kayitlarinda bos logo yerine OmaLeima logosunu default yap.
Mimari: focused mobile helpers + explicit error classification + guarded native-module availability check + repeatable hosted seed script + DB trigger/backfill migration.
Kapsam: mobile profile/session/audio files, admin showcase seed, Supabase business logo migration, hosted seed/apply, working docs ve validation.
Cikti: Strict TS/TSX/SQL patch, hosted data summary, validation raporu ve real-device smoke checklist.
Yasaklar: `any` yok, native module top-level load yok, duplicate tag redbox yok, real accounts delete yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, explicit errors, RLS/source-of-truth, focused validation.

## Mobile Runtime Recovery + Expanded Demo Accounts Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run bootstrap:showcase-events`
- Hosted Supabase count query for null business logos, events, registrations, venues, stamps, and leaderboard rows.
- `git --no-pager diff --check`

## Current Plan (Store Screenshot Demo Reset + Stale Native Audio Guard)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Remove stale-native audio crashes from QR scan feedback, polish the business profile language icon, clear hosted demo event data, and seed App Store / Google Play screenshot-ready Finnish demo content tied to existing business/student accounts.

## Store Screenshot Demo Reset + Stale Native Audio Guard Architectural Decisions

- Replace `import("expo-audio")` with guarded action-time `require` plus explicit runtime shape validation. This keeps audio available after a fresh build while preventing missing native modules from red-screening old dev clients.
- Keep haptics as best-effort and never let sound playback errors affect scan result state.
- Align `LanguageDropdown` icon styling to the profile row icon style by removing the standalone lime bubble/background.
- Use a repeatable Supabase seed artifact instead of one-off manual mutations. The seed may destructively delete event/stamp/reward/announcement/leaderboard data, but it must preserve existing user accounts.
- Seed polished Finnish puhekieli demo events, venues, reward tiers, announcements, registrations, and leaderboard/showcase history for screenshot capture. The existing business remains a scanner venue for the active test event.

## Store Screenshot Demo Reset + Stale Native Audio Guard Edge Cases

- If `expo-audio` is not linked in the installed app, feedback must degrade without user-visible crash.
- If there are no existing business staff, club organizer, or student accounts in hosted Supabase, the seed should fail loudly with a clear error rather than creating ambiguous accounts.
- Active QR scan testing should remain possible after seeding; demo stamps should not pre-consume every active student/business combination needed for the user's manual QR test.
- Re-running the seed should not create duplicate events, rewards, announcements, or leaderboard rows.
- Public screenshot images must be stable remote URLs or already hosted app assets so devices can load them during capture.

## Prompt

Sen Expo React Native runtime-stability engineer ve Supabase demo-data release operator olarak calisiyorsun.
Hedef: Isletme scanner QR sonucunda `ExpoAudio` olmayan eski native build'lerde crash olmasin; profil dil ikonunu diger business profile ikonlariyla ayni yap; hosted Supabase'teki demo event/leima/duyuru/reward/leaderboard verisini temizle ve market screenshot cekimleri icin Finnish puhekieli demo verisi olustur.
Mimari: guarded native module resolver + best-effort audio/haptic feedback + focused shared profile UI polish + repeatable SQL/seed script + hosted Supabase transaction.
Kapsam: mobile scan feedback utility, shared language dropdown, seed/reset artifact, hosted Supabase demo data, working docs ve validation. Auth user/profile silme yok.
Cikti: Strict TS/TSX/SQL patch, hosted seed execution summary, validation raporu ve cihazda test edilecek maddeler.
Yasaklar: `any` yok, native module top-level import yok, sessiz veri seed hatasi yok, gercek hesaplari silmek yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, explicit errors, RLS/source-of-truth awareness, focused validation.

## Store Screenshot Demo Reset + Stale Native Audio Guard Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
- Hosted Supabase pre/post row counts for events, stamps/leimat, announcements, rewards, and leaderboard data.
- Manual real-device smoke after fresh build: business scanner success/error feedback, no `ExpoAudio` red screen, student QR scan, event/leaderboard/reward/demo announcement visibility.

## Current Plan (Full Release Readiness Review)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Decide whether OmaLeima web and mobile are ready for Android Play Store, Apple App Store/TestFlight, and production web release with no overlooked security, logic, UX, compliance, or runtime blockers.

## Full Release Readiness Review Architectural Decisions

- Treat this as a release gate, not a casual review. Findings must be grounded in exact repository evidence, validation output, or an explicitly blocked real-device/credential prerequisite.
- Split review into independent streams: security/RLS/Edge Functions, admin/organizer web, Expo mobile app flows, Supabase/Postgres integrity, and QA/test coverage.
- Run only non-destructive validation commands locally. Hosted/production checks must be read-only unless a concrete fix is later approved or clearly required.
- Prioritize release blockers first: security vulnerabilities, store-policy blockers, native build/runtime crashes, QR/reward integrity failures, auth/session breakage, privacy/legal gaps, and untested hardware-only features.
- Keep a residual-risk ledger for anything that cannot be proven in this environment, especially physical device camera/push/OAuth/audio/share flows and authenticated hosted admin/organizer smoke.

## Full Release Readiness Review Edge Cases

- Passing typecheck/build/audit does not prove rendered UI, QR camera, push notifications, or store review readiness.
- A dirty worktree means findings must distinguish current touched changes from older unrelated changes; do not revert anything.
- Store readiness differs from production web readiness: iOS Google-only sign-in policy, native permission manifests, Android notification icon behavior, and real-device OAuth/push/camera checks need separate conclusions.
- Security findings need validation, not speculation; report only when the exploit path and missing control are concrete.

## Prompt

Sen release-readiness lead, security reviewer ve Expo/Next.js/Supabase QA engineer olarak calisiyorsun.
Hedef: OmaLeima'nin web, iOS ve Android cikisa hazir olup olmadigini karar seviyesinde denetle; en kucuk security, mantik, UX, store-policy, native-runtime ve test coverage riskini kanitla veya bloke olarak kaydet.
Mimari: paralel subagent review + repo inventory + non-destructive validation commands + security threat-model/discovery/validation + web/mobile/native release matrix.
Kapsam: `apps/admin`, `apps/mobile`, `supabase`, smoke/audit scripts, docs/runbooks, working docs ve final readiness report. Onay verilmeden destructive production mutation yok.
Cikti: Prioritized blocker list, validated commands, release decision, residual risk ledger ve next actions.
Yasaklar: ustun koru review yok, credential/device yokken test edildi demek yok, unrelated dirty changes revert yok, speculative finding yok.
Standartlar: AGENTS.md, Codex Security scan phases, Expo deployment/dev-client guidance, ECC click-path audit, Build Web frontend validation.

## Full Release Readiness Review Validation Plan

- `git status --short`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `npm --prefix apps/mobile run audit:native-push-device-readiness`
- `npm --prefix apps/mobile run audit:realtime-readiness`
- `npm --prefix apps/mobile run audit:hosted-business-scan-readiness`
- `npx --yes supabase@2.98.2 db lint --local`
- Focused static scans for secrets, top-level native imports, raw error leakage, TODO/FIXME, RLS/SECURITY DEFINER grants, and route/API auth guards.

## Full Release Readiness Review Results

- **Decision:** not ready for public App Store / Google Play / production cutover yet. Repo-owned build, lint, audit, Supabase lint, local migration, and iOS simulator compile gates are green after fixes, but store release still needs physical-device smoke, hosted Supabase/Edge Function deployment, hosted credentialed dashboard smoke, and an Apple Google-only login policy decision.
- **Security fixes completed:** admin password session Turnstile bypass closed, scanner device bypass closed, suspended-profile RLS/RPC hardening added, leaderboard RPC spoofing narrowed, latest-stamp helper revoked from non-service roles, and admin delete now revokes Auth.
- **Validation completed:** admin typecheck/lint/build, mobile typecheck/lint/export/web audits, Supabase local migration/lint, npm audit, Expo Doctor, native simulator/push/realtime/reward audits, hosted business scan readiness audit, password-session origin smoke, focused diff-check, Expo iOS prebuild, Pod install, and iOS Release simulator compile with isolated DerivedData.
- **Validation blocked:** Deno Edge Function typecheck because `deno` is missing, Android/iOS physical-device smoke because no online device is available, and hosted authenticated smoke because no staging credentials were provided.
- **Next release sequence:** deploy the new Supabase migration and `scan-qr` function, deploy admin web, create fresh iOS/Android builds, run the real-device smoke checklist, decide or implement Apple sign-in policy, then run hosted credentialed admin/organizer smoke before store submission.

## Current Plan (Mobile QR Scan Feedback + Icon Completeness)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make QR scanning feel immediate and premium for both business staff and students with safe sound/haptic feedback, and complete missing store icon sizes with audit coverage.

## Mobile QR Scan Feedback + Icon Completeness Architectural Decisions

- Add a shared `safe-scan-feedback` utility under `features/foundation` so scanner and student reward surfaces use the same success/warning/error semantics.
- Use `expo-audio` through action-time dynamic import and cached players. This avoids route-load crashes on stale native builds while still enabling native audio after a rebuilt dev/store binary is installed.
- Keep sound effects short generated WAV data URIs rather than adding large media files. Success should be a soft ascending chime; warning/error should be short and less pleasant without being harsh.
- Pair audio with existing safe haptics: success uses notification success, warning uses warning, error uses error. Neutral tones do not make noise.
- Trigger business feedback exactly once when `lastResult` changes after a scan attempt completes. Trigger student success feedback through the existing deduped stamp celebration path.
- Add `expo-audio` to Expo config plugins and strengthen the store release audit for the dependency/plugin plus store icon dimension matrix.
- Generate missing Apple/iPad icon handoff sizes from the 1024 source icon without changing the runtime `icon` source of truth.

## Mobile QR Scan Feedback + Icon Completeness Edge Cases

- If `expo-audio` is missing from an old installed binary, audio should not crash the route; haptics remain best-effort.
- A repeated render of the same scanner result must not replay sound repeatedly.
- Neutral outcomes and blocked pre-submit validation should not produce a success sound.
- Student realtime and polling paths can both observe the same stamp; the existing celebration key must continue to dedupe sound/celebration.
- Generated icon files must have exact pixel dimensions and should be checked by a deterministic audit script.

## Prompt

Sen Expo React Native release-quality engineer olarak calisiyorsun.
Hedef: QR okutuldugunda isletme scanner ekraninda ve ogrenci aktif QR/leima ekraninda basari icin guzel kisa ses + haptic, hata/uyari icin ayri feedback ver; eksik store icon boyutlarini uret ve audit ile dogrula.
Mimari: shared safe feedback helper + dynamic `expo-audio` import + cached audio players + existing safe haptics + scanner result/student celebration integration + icon dimension audit.
Kapsam: mobile feedback utility, business scanner, student active event celebration, Expo config/package, icon assets, store-readiness audit, working docs ve validation. Backend scan semantics veya QR token logic degismeyecek.
Cikti: Strict TS/TSX/JS/assets patch, validation raporu.
Yasaklar: top-level native audio import yok, eski dev-client crash'i yok, uzun ses dosyasi yok, repeated replay yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, Expo SDK 55 `expo-audio`, explicit validation, focused diff.

## Mobile QR Scan Feedback + Icon Completeness Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `OMALEIMA_STORE_BUILD=1 npx expo prebuild --platform ios --no-install`
- `OMALEIMA_STORE_BUILD=1 npx expo prebuild --platform android --no-install`
- Focused `git --no-pager diff --check`

## Current Plan (Mobile Community Club Detail Modal Scroll)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make the mobile Community/Yhteisö club detail popup robust for long club profiles by constraining the sheet to safe viewport height and making only its content scroll.

## Mobile Community Club Detail Modal Scroll Architectural Decisions

- Keep the existing inline modal component and data contract; this is a focused layout/overflow fix.
- Use `useSafeAreaInsets` plus `useWindowDimensions` to compute a reliable maximum sheet height that leaves room for status bar, bottom inset, and tab bar.
- Make the sheet an explicit flex container with a constrained `height/maxHeight`, then set the inner `ScrollView` to `flex: 1` so content scrolls inside the sheet.
- Split the close action into a sticky/non-scrolling header row above the `ScrollView` so the user can always dismiss the modal.
- Cap cover height and long text rows to prevent pathological URL/email/announcement content from breaking the layout.

## Mobile Community Club Detail Modal Scroll Edge Cases

- Very short screens should still leave a minimum usable modal height.
- Long announcements should wrap but not push the sheet outside the viewport.
- Long URLs/emails should wrap inside their row instead of forcing horizontal overflow.
- Missing contact fields should still show the existing empty-state text.
- The backdrop should still close the modal, while scrolling inside the sheet should not trigger backdrop dismissal.

## Prompt

Sen Expo React Native mobile UI engineer olarak calisiyorsun.
Hedef: Student Community/Yhteisö kulüp detay popup'i uzun içerikte ekran dışına taşmasın; kendi içinde scroll etsin ve contact/link alanları taşma yaratmasın.
Mimari: Existing modal + safe-area-aware fixed sheet height + flex-constrained ScrollView + sticky close/header + text wrapping safeguards.
Kapsam: `apps/mobile/src/features/club/public-club-directory-section.tsx`, working docs ve validation. DB/query contract, club profile schema veya unrelated modal refactor yok.
Cikti: Strict TSX patch, validation raporu.
Yasaklar: `any` yok, silent fallback yok, native Dimensions API yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, Expo mobile UI guidance, explicit user-visible errors, focused diff.

## Mobile Community Club Detail Modal Scroll Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Mobile App Icon + Notification Branding)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Ensure iOS, Android launcher icons, Android 13 monochrome icon, and Android notification tray icons use OmaLeima branding instead of default Expo assets.

## Mobile App Icon + Notification Branding Architectural Decisions

- Remove the iOS-specific `./assets/expo.icon` override by pointing `ios.icon` directly to the same production OmaLeima PNG used by the top-level app icon.
- Replace the Android adaptive monochrome image with a white/transparent OmaLeima stamp glyph, so Android themed icons do not show the Expo caret.
- Add a dedicated `assets/images/notification-icon.png` 96x96 all-white/transparent icon and reference it from the `expo-notifications` config plugin.
- Keep the notification tint color as OmaLeima lime `#C8FF47`.
- Run Expo prebuild after config/asset changes so generated iOS/Android native resources reflect the new assets.

## Mobile App Icon + Notification Branding Edge Cases

- Existing installed builds keep their old native icon resources until a new dev/preview/store build is installed.
- Android notification small icons are intentionally monochrome/transparent; full-color app icons are not valid for the tray icon.
- iOS notification banners use the app icon/bundle resources; there is no separate iOS notification icon config in Expo Notifications.
- The old `assets/expo.icon` folder can remain unused, but app config must not point to it.

## Prompt

Sen Expo release branding engineer olarak calisiyorsun.
Hedef: Mobil uygulamada iOS/Android app icon ve Android notification icon default Expo yerine OmaLeima logosunu kullansin.
Mimari: Expo app config icon paths + `expo-notifications` config plugin icon + generated native resource sync via Expo prebuild.
Kapsam: `apps/mobile/app.config.ts`, mobile image assets, working docs ve validation. Runtime notification logic, push payload contracts veya unrelated UI yok.
Cikti: Strict config patch, generated PNG assets, validation/prebuild raporu.
Yasaklar: default Expo icon path'i kullanmak yok, Android notification icon'u renkli/full-background yapmak yok, native rebuild gerektigini saklamak yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, Expo notification/app icon docs, explicit validation.

## Mobile App Icon + Notification Branding Validation Plan

- Verify asset dimensions with `file`/`sips`.
- `OMALEIMA_STORE_BUILD=1 npx expo prebuild --platform ios --no-install`
- `OMALEIMA_STORE_BUILD=1 npx expo prebuild --platform android --no-install`
- Inspect generated iOS/Android resource paths for Expo icon remnants.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- Focused `git --no-pager diff --check`

## Current Plan (Admin Manual Organization Account Creation)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Add an admin web flow for creating an organization/club account manually, equivalent to the manual business owner account flow: owner email/password, owner profile, club profile, and owner membership in one controlled operation.

## Admin Manual Organization Account Creation Architectural Decisions

- Reuse the proven business creation pattern: client form -> admin-only route handler -> service-role auth user creation -> atomic database RPC -> auth rollback on database failure.
- Create a separate RPC, `admin_create_club_owner_account_atomic`, so organization profile/member writes are atomic and do not depend on client-side multi-step mutation order.
- Keep email reuse blocked before auth creation. The manual form is for new organization owners, not for silently converting or taking over existing accounts.
- Store organization fields directly on `clubs`: `name`, generated unique `slug`, `university_name`, `city`, `country`, `contact_email`, `phone`, `address`, `website_url`, `instagram_url`, and `announcement`.
- Update the new owner profile to `CLUB_ORGANIZER`, `ACTIVE`, and create one `club_members` row with `OWNER`/`ACTIVE`.
- Render the organization form in the existing admin manual account handoff tab beside the business form to keep account delivery in one operational area.

## Admin Manual Organization Account Creation Edge Cases

- Existing email must fail before creating a new Auth user; no existing account takeover.
- If Auth user creation succeeds but the database RPC fails, the route must delete the created Auth user and return the original database error context.
- Slug collisions must resolve deterministically with numeric suffixes.
- Optional organization fields should persist as `null` when empty, not as whitespace.
- Only active platform admins may call the route or execute the RPC via the service role path.

## Prompt

Sen Next.js admin ve Supabase security engineer olarak calisiyorsun.
Hedef: Admin paneline isletme hesabi olusturma akisi gibi tam manuel organizasyon hesabi olusturma akisi ekle; admin owner email/sifre/isim ve organizasyonun tum contact/profil bilgilerini girsin, sistem owner auth user, profile role, club profile ve owner membership'i tek islemde olustursun.
Mimari: Client form + admin-only Next.js route handler + service-role Auth user creation + rollback + `SECURITY DEFINER` atomic PostgreSQL RPC + audit log.
Kapsam: admin manual account UI, yeni API route, yeni Supabase migration/RPC, working docs ve validation. Existing business account flow veya recovery-link flow davranisini degistirme.
Cikti: Strict TS/TSX/SQL patch, localized FI/EN form copy, validation raporu.
Yasaklar: `any` yok, existing email devralma yok, partial DB state yok, silent fallback yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, RLS/zero-trust, explicit errors, existing dashboard visual language.

## Admin Manual Organization Account Creation Validation Plan

- `npx --yes supabase@2.98.2 migration up --local`
- `npx --yes supabase@2.98.2 db lint --local`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Focused `git --no-pager diff --check`

## Current Plan (Native Share Guard + Organizer Profile Polish)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Stop leima-card save/share from crashing on stale native builds, make long business appro event details scroll predictably, bring organizer mobile reports up to the business ROI quality bar, and add web organizer profile editing for contact fields.

## Native Share Guard + Organizer Profile Polish Architectural Decisions

- Replace `expo-sharing` usage in the student QR share action with React Native `Share.share` to avoid a hard native-module dependency for sharing. Keep `expo-media-library` only for saving because Photos/Gallery write access is the correct native API.
- Resolve `react-native-view-shot` capture from both named and default export shapes, and validate callable functions before invoking them.
- Keep QR security invariant intact: capture/share only the hidden leima-card stage, never the live QR face.
- Tighten business event modal height/content padding so long descriptions remain scrollable without changing event data or navigation structure.
- Redesign mobile organizer reports in the screen layer using the existing `useClubReportQuery` payload, mirroring business ROI's hero, icon metric cards, localized number/date/status formatting, and event metric pills.
- Add a new web `/club/profile` page with server-fetched editable club records and a route-handler PATCH endpoint that authorizes active `OWNER`/`ORGANIZER` club memberships before updating public contact fields.

## Native Share Guard + Organizer Profile Polish Edge Cases

- Old installed dev clients may still fail saving to Photos until a new native build with `ExpoMediaLibrary` is installed; the app should surface this as an actionable error.
- Share can be unavailable or reject file URIs on some OS versions; the action should remain caught and user-visible.
- Staff-only club members should not update organization profile fields from the web panel unless product policy later expands that permission.
- Empty optional fields should persist as `null`; user-entered URLs/emails should be validated before update.
- Organizer report screens should show a clean empty state when there are no reportable events.

## Prompt

Sen Expo React Native ve Next.js organizer-platform engineer olarak calisiyorsun.
Hedef: Leima-card save/share runtime crash'lerini duzelt; business approssa uzun event detaylarini scroll edilebilir yap; mobil organizer raportit ekranini business ROI kalitesinde polish et; web organizer paneline phone/address dahil club profile edit formu ekle.
Mimari: React Native built-in share + robust view-shot export resolver; action-time media-library guard; screen-level modal/report UI fixes; Next.js server read model + route-handler PATCH authorization; existing Supabase `clubs` fields.
Kapsam: `student/active-event.tsx`, `business/events.tsx`, `club/reports.tsx`, yeni web club profile feature/page/API, dashboard nav/i18n, working docs ve validation.
Cikti: Strict TS/TSX patch, localized UI, validation raporu ve real-device smoke notlari.
Yasaklar: `any` yok, QR token share/capture yok, staff yetkisini genisletmek yok, silent fallback yok, unrelated dirty change revert yok.
Standartlar: AGENTS.md, explicit errors, existing mobile/web visual language, focused validation.

## Native Share Guard + Organizer Profile Polish Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Focused `git --no-pager diff --check`

## Current Plan (Hosted Club Contact + Native Share Build Gate)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make the hosted club contact fields available in production, stop old native binaries from crashing the student QR route, prove the native share modules are linked for new builds, and hand over a precise physical-device smoke checklist.

## Hosted Club Contact + Native Share Build Gate Architectural Decisions

- Verify hosted Supabase with read-only information-schema SQL before applying DDL; only apply the idempotent nullable-column migration if columns are missing.
- Keep the share/save feature, but move native module loading into action-time dynamic imports so older dev clients show an explicit error instead of breaking the whole route.
- Keep QR screen protection active during the QR-to-LEIMA flip transition and clear QR/token query cache whenever the QR side is not actively needed.
- Remove bearer token and QR token values from React Query keys; key QR generation by event plus non-secret session marker and SVG generation by event plus token expiry marker.
- Strengthen `audit:store-release-readiness` so generated native iOS state must include the new share modules and add-photo permission when a generated iOS project exists.
- Start fresh EAS development builds after the final QR/security patch, and cancel earlier queued builds that did not include the final patch.

## Hosted Club Contact + Native Share Build Gate Edge Cases

- Existing production columns may already exist under a different remote migration timestamp; runtime verification matters more than reapplying destructive migration repair.
- Old installed dev clients can still lack native modules until replaced. The app must avoid route-load crashes, but full save/share success requires a new binary.
- LEIMA share cards may be saved/shared; live QR tokens must not be captured, cached in query keys, or rendered while capture protection is inactive.
- Physical device checks cannot be simulated fully because iOS/Android photo library, share sheet, and screen-capture policy are OS/device behaviors.

## Prompt

Sen Expo native release-readiness ve Supabase migration engineer olarak calisiyorsun.
Hedef: Hosted Supabase `club_public_contact_fields` migration'inin production'da etkili oldugunu dogrula; `ExpoMediaLibrary` native module crash'ini root-cause seviyesinde duzelt; yeni native share dependencies icin iOS/Android development build'lerini yenile; QR screenshot/share guvenligini koru; gercek cihaz smoke checklist'ini net teslim et.
Mimari: Supabase MCP read-only verification + idempotent DDL only if needed; Expo action-time native dynamic import; React Query non-secret keys and short cache; QR screen protection transition guard; EAS development builds; docs/audit release gate.
Kapsam: `student/active-event.tsx`, `student-qr.ts`, mobile store-readiness audit, testing/runbook docs, hosted Supabase verification, EAS build submission. Unrelated UI/features yok.
Cikti: Strict TS/JS/doc patch, validation/build URLs, physical-device checklist.
Yasaklar: top-level native imports yok, bearer/QR token query key yok, QR gorunurken protection kapatmak yok, cihaz testi yapilmadan yapildi demek yok, destructive Supabase migration repair yok.
Standartlar: AGENTS.md, explicit errors, no silent fallback, focused validation, subagent review findings kapatilir.

## Hosted Club Contact + Native Share Build Gate Validation Plan

- Hosted Supabase information-schema column verification.
- `OMALEIMA_STORE_BUILD=1 npx expo prebuild --platform ios --no-install`
- `cd apps/mobile/ios && pod install`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npm --prefix apps/mobile run export:web`
- `cd apps/mobile && CI=1 npx expo-doctor`
- iOS Release simulator `xcodebuild ... CODE_SIGNING_ALLOWED=NO build`
- EAS Android/iOS development builds with message `refresh native share modules and qr protection`

## Current Plan (Dashboard Locale + Claims Smoke + Student Reward Detail)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make dashboard language switching reliable on admin/organizer web, verify claims/dashboard smoke locally where possible, and present student event rewards from a top gift action instead of burying them near the bottom of the detail page.

## Dashboard Locale + Claims Smoke + Student Reward Detail Architectural Decisions

- Change the dashboard locale button to navigate through the existing `/api/dashboard-locale` route with a safe `returnTo`, so the server sets the authoritative httpOnly cookie and redirects back to the current dashboard page.
- Keep the existing browser smoke harness as the main credentialed local click-smoke; extend only if the run reveals a concrete gap.
- Verify `/club/claims` via the browser smoke route click and database/read-model inspection; do not mutate production data just to prove visibility.
- Add a student event reward summary button near the registration/join header with a gift SVG icon and FI/EN copy. Open a modal listing reward title, required leimas, stock, description, and claim instructions.
- Remove the buried reward list from the venue section and from the venue modal to avoid duplicate/hidden reward information.

## Dashboard Locale + Claims Smoke + Student Reward Detail Edge Cases

- Locale switch return paths must only allow `/admin`, `/admin/*`, `/club`, and `/club/*`.
- Locale toggle labels in smoke remain English-first because the helper starts with the English dashboard locale cookie.
- Events with no reward tiers should show a disabled/empty reward state instead of an empty modal.
- Physical device/dev-client checks require a reachable device/session and real credentials; if unavailable, report them explicitly rather than pretending terminal validation equals device smoke.

## Prompt

Sen Next.js dashboard reliability engineer ve Expo student UX engineer olarak calisiyorsun.
Hedef: Admin/organizer web panelinde dil degisimi loading'de kalmadan gercekten degissin; local seeded Supabase + admin dev server ile credential'li `/admin` ve `/club` browser smoke calissin; `/club/claims` route ve event gorunurlugu dogrulansin; student event detail'de palkinto/reward bilgileri ustte hediye ikonlu FI/EN aksiyondan modal olarak acilsin.
Mimari: existing `/api/dashboard-locale` redirect cookie writer; existing Playwright dashboard browser smoke; screen-local reward modal; existing reward tier data contract.
Kapsam: dashboard locale switch, student event detail reward presentation, working docs, validation/smoke commands. Claim data mutation veya unrelated flows yok.
Cikti: Strict TS/TSX patch, smoke/validation raporu, kalan cihaz gate'leri.
Yasaklar: `any` yok, unsafe redirect yok, production data mutate etmek yok, reward bilgisini sadece alta gommek yok, cihaz smoke'u yapilmadan yapildi demek yok.
Standartlar: AGENTS.md, explicit errors, focused diff, seeded local credentials, existing design language.

## Dashboard Locale + Claims Smoke + Student Reward Detail Validation Plan

- `npx --yes supabase@2.98.2 start`
- `npx --yes supabase@2.98.2 migration up --local`
- `docker restart supabase_auth_omaleima`
- `docker exec -i supabase_db_omaleima psql -v ON_ERROR_STOP=1 -U postgres -d postgres < supabase/seed.sql`
- `npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001`
- `ADMIN_APP_BASE_URL=http://localhost:3001 npm --prefix apps/admin run smoke:dashboard-browser`
- `npm --prefix apps/admin run typecheck && npm --prefix apps/admin run lint && npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck && npm --prefix apps/mobile run lint && npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Mobile Student/Business UX Fix Pack)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Resolve the reported mobile student/business UX issues with focused, type-safe screen/component fixes while preserving QR security and existing backend contracts.

## Mobile Student/Business UX Fix Pack Architectural Decisions

- Make the business event preview sheet internally scrollable with bounded height instead of changing event data or splitting a new route.
- Redesign business ROI in the screen layer using the existing `get_business_roi_report` payload. Do not invent monetary ROI without sales/POS data.
- Stop automatic hero scrolling on selected QR event changes. Selection state remains source-of-truth; user-initiated swipes/taps still update the selected event.
- Keep the language dropdown as the single reusable component and update its visual system once so student, business, and organizer profiles inherit the same treatment.
- Replace the community icon-only detail action with a labeled `Detail/Tiedot` button and enrich the modal using data already returned by the public club directory query.
- Add leima-card sharing only for the LEIMA/pass side. Use a native rendered share card captured with `react-native-view-shot`, then save via `expo-media-library` or share via `expo-sharing`. Do not capture or share active QR tokens.
- `imagegen` skill decision: skip AI bitmap generation for this slice because the share asset must be dynamic per user/event/stamp state and is better rendered natively from app data. This follows the skill's "do not use when better handled by code-native assets" rule.

## Mobile Student/Business UX Fix Pack Edge Cases

- Long descriptions must be scrollable inside the modal without making the backdrop impossible to close.
- ROI rows with unknown future statuses should show a localized fallback instead of raw status shouting.
- Student QR selection should not jump when query data refreshes if the selected event still exists.
- Save/share actions may be unavailable on web/simulator or when photo permission is denied; show explicit localized errors and do not pretend success.
- Club details may be missing phone/address fields depending on schema. The UI should show every currently available public field and localized "not added" for absent values.

## Prompt

Sen Expo React Native mobile UX engineer olarak calisiyorsun.
Hedef: Kullanici tarafindan bildirilen mobil student/business UX sorunlarini duzelt: business event preview uzun aciklamada scroll edilsin, business ROI FI/EN olarak profesyonel ve anlasilir olsun, student Oma QR event secimi otomatik kaymasin, tum profil dil dropdown'u icon/text tasarimi diger ikonlarla hizalansin, Yhteisö kulup kartinda belirgin Detail/Tiedot butonu ve zengin logo/banner/contact modal'i olsun, QR token paylasilmadan yalnizca leima-card tarafi kaydedilip/paylasilabilsin.
Mimari: screen/component-level fixes; existing Supabase query contracts; reusable LanguageDropdown; native dynamic share card via view capture; no backend/schema changes unless existing data proves insufficient.
Kapsam: `business/events.tsx`, `business/reports.tsx`, `student/active-event.tsx`, `language-dropdown.tsx`, `public-club-directory-section.tsx`, app config/package dependencies, working docs ve validation.
Cikti: Strict TS/TSX patch, dependency/config updates if required, validation report.
Yasaklar: `any` yok, QR token/card front screenshot/share yok, monetary ROI uydurmak yok, silent failure yok, unrelated refactor yok.
Standartlar: AGENTS.md, mevcut mobile theme/localization patterns, explicit user-facing errors, focused diff.

## Mobile Student/Business UX Fix Pack Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Student/Business Mobile + Public Web Surface Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Improve student and business surfaces by replacing raw technical/status messages with localized product copy and aligning visible labels with OmaLeima's event/leima domain.

## Student/Business Mobile + Public Web Surface Sweep Architectural Decisions

- Keep Supabase RPC result/status contracts unchanged; add screen/component-level presentation helpers.
- Map all currently typed student join/cancel statuses to localized UI copy so known outcomes never fall through to raw code strings.
- Keep unknown transport/database errors visible enough for debugging, but avoid leaking venue ids, generated map URLs, or full RPC context in common user-facing cards.
- Reuse the existing language pattern in business events and reward cards rather than introducing a new i18n system.
- Keep the public business application API response contract unchanged; localize the client-side failure presentation using existing page content instead of trusting server operational messages.
- Normalize server field error keys to existing localized field hints/error labels so public web forms do not expose Zod's English validation text.
- Apply the same field-error presentation pattern to `/contact` because contact submissions are part of the public student/business acquisition and support surface.

## Student/Business Mobile + Public Web Surface Sweep Edge Cases

- Unknown future RPC statuses should remain visible with a generic unknown-status message.
- Business network/RPC transport errors should not pretend the action succeeded; they should remain error cards with localized body text.
- Reward type labels must preserve the product vocabulary: `Haalarimerkki`, patch, coupon, product, entry, and other.
- Map/ticket open failures can happen because of device capabilities, simulator limitations, or OS settings; show actionable copy instead of raw URLs.
- `/apply` Turnstile misconfiguration and verification failures should remain errors, but in the page's selected language.
- Server `fieldErrors` on `/apply` and `/contact` should still highlight the correct fields, but the visible copy must come from locale-aware form content.

## Prompt

Sen Expo React Native student/business product QA engineer olarak calisiyorsun.
Hedef: Student ve isletme mobil/public-web yuzeylerinde raw status/technical error/enum gorunumu olan somut kusurlari duzelt: student event join/cancel tum typed status'lari localized olsun, venue map/ticket hata metinleri kullanici dostu olsun, business active event Fince label'i `Käynnissä` olsun, business transport error karti localized olsun, reward type enum'u polish label olarak gorunsun ve `/apply` ile `/contact` server error/field error metinleri locale-aware olsun.
Mimari: screen/component presentation helpers; public form client-side error presenter; mevcut React Query/fetch contracts; no backend or schema changes.
Kapsam: `student/events/[eventId].tsx`, `business/events.tsx`, `student-event-venue-map.tsx`, `reward-progress-card.tsx`, `business-application-form.tsx`, `contact-form.tsx`, working docs ve validation. Admin/organizer flow, Supabase RPC, store config veya unrelated dirty files yok.
Cikti: Strict TS/TSX patch ve validation raporu.
Yasaklar: `any` yok, backend contract degistirmek yok, hatalari sessizce yutmak yok, unknown status'u tamamen gizlemek yok.
Standartlar: AGENTS.md, existing mobile localization/style patterns, explicit errors, focused diff.

## Student/Business Mobile + Public Web Surface Sweep Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Focused `git --no-pager diff --check`

## Current Plan (Mobile Organizer Announcement Notice Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Localize organizer mobile announcement validation and lifecycle notices so Finnish organizer sessions do not leak raw English implementation messages.

## Mobile Organizer Announcement Notice Sweep Architectural Decisions

- Keep the announcement mutation layer explicit and unchanged; translate known UI-facing errors in the screen-level notice helper.
- Add targeted string-match mappings for existing validation and `NOOP` lifecycle messages, preserving raw unknown errors for debugging.
- Replace the hardcoded club picker eyebrow with locale-aware copy.

## Mobile Organizer Announcement Notice Sweep Edge Cases

- Unknown Supabase/database errors must remain visible rather than being converted into generic success/failure text.
- `NOOP` update/archive/delete responses should be shown as localized error notices, not hidden.
- Success notices already localize action copy and should keep the current transient-success behavior.

## Prompt

Sen Expo React Native organizer announcements reviewer ve localization engineer olarak calisiyorsun.
Hedef: Mobil organizator duyuru formunda validation/NOOP hatalarini FI/EN localized action notice olarak goster; hardcoded `Club` eyebrow'ini locale-aware yap.
Mimari: screen-level `createActionNotice` matcher; existing mutation result statuses; no backend contract change.
Kapsam: `apps/mobile/src/app/club/announcements.tsx`, working docs ve validation. Announcement transport, Supabase schema, push hedefleme veya unrelated flows yok.
Cikti: Strict TSX patch ve validation raporu.
Yasaklar: `any` yok, error mesajlarini sessizce yutmak yok, mutation payload contract degistirmek yok.
Standartlar: AGENTS.md, existing mobile localization pattern, explicit errors, focused diff.

## Mobile Organizer Announcement Notice Sweep Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Mobile Organizer Copy Consistency Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make organizer mobile event-facing status labels and action notices consistent in Finnish and English while preserving existing mutation data contracts.

## Mobile Organizer Copy Consistency Sweep Architectural Decisions

- Keep mutation return payloads unchanged; localize presentation in the screen/component layer.
- Use a typed success-message mapper that only returns text for `status === "SUCCESS"` so non-success mutation data cannot appear as a success notice.
- Keep unknown backend messages visible for debugging instead of hiding them, but localize known lifecycle and ticket URL errors in `createClubEventActionNotice`.
- Align `LIVE` status copy with the existing organizer events/upcoming pattern: `Käynnissä` in Finnish and `Live` in English.

## Mobile Organizer Copy Consistency Sweep Edge Cases

- Unknown future mutation success messages should still render explicitly rather than disappearing.
- Non-success mutation payloads should not trigger transient green success text.
- Published/active event delete still uses safe cancellation semantics; this slice changes only user-facing copy.
- Empty/invalid ticket URL errors should remain actionable and mention that an absolute `http` or `https` URL is required.

## Prompt

Sen Expo React Native organizer-flow reviewer ve localization engineer olarak calisiyorsun.
Hedef: Mobil organizator event yuzeylerinde kalan FI/EN karisimini duzelt: `LIVE` Fince rozetleri dogru olsun, event create/update/cancel/delete basari mesajlari kullanici dilinde gorunsun ve non-success mutation mesajlari success alanina dusmesin.
Mimari: screen-local typed message mapper; existing mutation result shape; localized error notice matcher; component-level timeline label maps.
Kapsam: `apps/mobile/src/app/club/events.tsx`, `apps/mobile/src/app/club/home.tsx`, `apps/mobile/src/features/club/components/club-event-preview-modal.tsx`, working docs ve validation. Backend/RPC, student/business flow veya event deletion semantics degismeyecek.
Cikti: Strict TS/TSX patch ve validation raporu.
Yasaklar: `any` yok, backend message contract degistirmek yok, error mesajlarini sessizce saklamak yok, published/active event hard-delete yok.
Standartlar: AGENTS.md, mevcut mobile localization pattern, explicit errors, focused diff.

## Mobile Organizer Copy Consistency Sweep Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Admin/Organizer Cross-Surface QA Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Fix the next concrete admin/organizer quality issues discovered during the cross-surface review and extend regression coverage so they stay fixed.

## Admin/Organizer Cross-Surface QA Sweep Architectural Decisions

- Keep this slice focused on admin/organizer surfaces only; do not refactor student/business flows unless a direct shared dependency breaks validation.
- Add `/club/reports` to the existing dashboard browser smoke route list instead of creating a separate partial smoke.
- Localize mobile organizer report row metrics and event statuses with typed helper functions in the screen, matching the existing page-level `language` pattern.
- Preserve the current report data contract; only change presentation and test coverage.

## Admin/Organizer Cross-Surface QA Sweep Edge Cases

- Unknown future event statuses should remain visible as raw values rather than silently disappearing.
- Browser smoke route labels must stay English because the helper deliberately sets the dashboard locale cookie to English before login.
- Mobile report screens can be empty; localization helpers must not depend on having events.

## Prompt

Sen Next.js dashboard QA engineer ve Expo organizer mobile reviewer olarak calisiyorsun.
Hedef: Admin/organizer cross-surface review sirasinda bulunan somut problemleri duzelt: web dashboard smoke yeni organizer reports rotasini kapsasin, mobile organizer reports Fince/English karismasi ve raw status gostermesin.
Mimari: mevcut browser smoke route matrix; screen-local typed localization helpers; mevcut report query/data contract.
Kapsam: `smoke-dashboard-browser`, `club/reports` mobile screen, working docs ve validation. Student/business unrelated flow refactor yok.
Cikti: Strict TS/TSX patch ve validation raporu.
Yasaklar: `any` yok, report RPC/data contract degistirmek yok, smoke'u flakey sleeps ile sisirmek yok, raw status'u sessizce gizlemek yok.
Standartlar: AGENTS.md, existing dashboard/mobile localization pattern, focused diff.

## Admin/Organizer Cross-Surface QA Sweep Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Web Login Legal Links + Dashboard Locale Polish)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Polish the admin/organizer web surfaces that are visibly wrong now, then deploy the already validated hosted Supabase report/re-engagement backend changes.

## Web Login Legal Links + Dashboard Locale Polish Architectural Decisions

- Reuse existing public routes for Privacy, Terms, and Contact/Support from the admin login page; use the existing public Instagram URL with safe external-link attributes.
- Keep the login footer minimal and non-blocking so it does not compete with the password login panel or Turnstile.
- Make shortcut cards resilient with wrapping/flex layout and localized badge labels rather than truncating copy or hiding counts.
- Localize the organizer event rules builder through a typed locale copy object and pass the current dashboard locale from the club events panel.
- Convert admin and club navigation to locale-aware helper functions while preserving existing href/icon structure.
- Use hosted Supabase CLI deployment only after local validations pass; if remote migration history blocks `db push`, report the blocker rather than forcing a destructive reconciliation.

## Web Login Legal Links + Dashboard Locale Polish Edge Cases

- Finnish badge labels can be longer than English; the card layout must allow wrapping without overlapping the description.
- Existing saved event `rules_json` may be invalid; the localized builder must keep the existing explicit error path.
- Login legal links must not depend on authenticated dashboard state.
- Hosted deployment must not log service-role secrets or access tokens.

## Prompt

Sen Next.js dashboard UI engineer, localization reviewer ve Supabase deployment operator olarak calisiyorsun.
Hedef: Admin login legal/social/support linklerini ekle, dashboard kart overlay problemini duzelt, admin/organizer web'deki gorunen dil karisimlarini kapat ve onceki rapor/re-engagement Supabase degisikliklerini production'a guvenli sekilde deploy et.
Mimari: mevcut public legal route'lari; locale-aware typed copy maps; responsive shortcut card layout; mevcut Supabase CLI deployment flow.
Kapsam: admin login panel, dashboard sections/navigation, organizer event rules builder, CSS, working docs ve hosted deploy validation. Mobil UI veya unrelated dirty files yok.
Cikti: Strict TS/TSX/CSS patch, deployment/validation raporu.
Yasaklar: yeni harici URL uydurmak yok, badge'i gizleyerek sorunu saklamak yok, `any` yok, service-role secret loglamak yok, destructive Supabase migration reconcile yok.
Standartlar: AGENTS.md, mevcut dashboard tasarim dili, explicit errors, minimal focused diff.

## Web Login Legal Links + Dashboard Locale Polish Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npx --yes supabase@2.98.2 migration up --local`
- `npx --yes supabase@2.98.2 db lint --local`
- Hosted `supabase db push` or targeted deployment if remote history allows.
- `npx --yes supabase@2.98.2 functions deploy send-announcement-push --project-ref jwhdlcnfhrwdxptmoret`
- `git --no-pager diff --check`

## Current Plan (Ticket URL + Organizer/Business Reports)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Let organizers attach any ticket URL to events, give organizers professional event-performance reports on web/mobile, give businesses an honest ROI report, and make post-event re-engagement event-scoped.

## Ticket URL + Organizer/Business Reports Architectural Decisions

- Add `events.ticket_url` as a nullable HTTPS/HTTP URL, keeping naming generic so organizers can use Kide, another ticket platform, or their own landing page.
- Keep ticket creation/editing in organizer-owned event forms and render it for students as an external CTA only when present.
- Add reporting RPCs for club and business analytics instead of duplicating large aggregate queries across admin web and mobile.
- Base organizer reports on registrations, joined venues, valid/manual/revoked stamps, reward tiers, reward claims, venue traffic, and funnel rates.
- Base business ROI on joined event exposure, valid scans, unique students, repeat scanned students, scanner activity, and reward influence. Do not show monetary ROI without revenue/cost inputs.
- Add `announcements.event_id` and make event-scoped follow-ups target only registered students for that event while retaining existing announcement feed/push infrastructure.
- Build web reports as server-read data plus client-side event selection/re-engagement composer; build mobile reports as React Query backed role-specific screens.

## Ticket URL + Organizer/Business Reports Edge Cases

- Empty ticket URLs must persist as `null`; invalid or non-http(s) URLs must fail with explicit validation errors.
- Report RPCs must reject users who are not platform admins, the owning club staff, or the owning business manager.
- Scanner-only business users should not see business ROI reports because scanner scope is operational, not managerial.
- Event-scoped announcements must not leak private event announcements to students who did not register for that event.
- Post-event follow-up must be useful even if push is disabled: the announcement should still appear in the in-app feed for eligible recipients.
- Existing events without ticket URLs and older announcements without event IDs must continue to render normally.

## Ticket URL + Organizer/Business Reports Prompt

Sen Supabase reporting architect, Next.js dashboard engineer ve Expo React Native product engineer olarak calisiyorsun.
Hedef: Event'lere generic ticket URL ekle; organizer icin web ve mobilde profesyonel report ekranlari; business icin mobil ROI raporu; post-event registered-student re-engagement akisini event-scoped olarak kur.
Mimari: nullable `events.ticket_url`; scoped SECURITY DEFINER report RPCs; existing announcement/feed/push altyapisini `event_id` ile genisletme; Next.js server read model + client panel; Expo React Query screens.
Kapsam: Supabase migration/RPC/RLS, admin club event/report/announcement flows, mobile student ticket CTA, club reports, business ROI reports, working docs ve validation. Kide-specific alan, monetary ROI uydurma, scanner-only ROI yetkisi veya unrelated refactor yok.
Cikti: Strict SQL/TS/TSX patch ve test/validation raporu.
Yasaklar: `any` yok, silent fallback yok, client-only auth guard yok, private event data leak yok, revenue verisi olmadan para metrikleri yok.
Standartlar: AGENTS.md, Supabase RLS/atomic RPC kurallari, explicit errors, minimal focused diff, existing design system.

## Ticket URL + Organizer/Business Reports Validation Plan

- `npx --yes supabase@2.98.2 migration up --local`
- `npx --yes supabase@2.98.2 db lint --local`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Business Onboarding + Organizer Profile Exit)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Improve mobile business/organizer entry polish with a one-time business onboarding flow and clearer profile actions.

## Business Onboarding + Organizer Profile Exit Architectural Decisions

- Remove only the top-right business home profile shortcut; keep the existing business profile tab and sign-out flow.
- Add the shared `SignOutButton` to club/organizer profile preferences so logout behavior stays consistent with student/business surfaces.
- Implement business onboarding as a local-only modal component with three slides, localized FI/EN copy, dots, next/back controls, and existing project raster imagery.
- Persist first-run completion in SecureStore with a versioned per-user key so future onboarding copy changes can be re-shown by bumping the version.
- Provide a business profile preference row to reopen the same onboarding slider manually without changing the stored completion state.

## Business Onboarding + Organizer Profile Exit Edge Cases

- If SecureStore read fails, surface the onboarding instead of silently hiding it, because onboarding is non-destructive and helps first-time users.
- If userId is null, do not read/write onboarding state.
- Reopening onboarding from profile must work even after first-run completion.
- Scanner-only business users may be routed directly to scanner by access guards; this slice targets business home/profile users without changing scanner-only routing.

## Business Onboarding + Organizer Profile Exit Prompt

Sen Expo React Native product engineer ve mobile onboarding designer olarak calisiyorsun.
Hedef: Business mobil home profil shortcut'ini kaldir, organizer profile'a sign-out ekle ve business kullanicilar icin ilk giriste tek seferlik, profilden tekrar acilabilir fotografli onboarding slider'i kur.
Mimari: SecureStore-backed per-user onboarding state; reusable localized modal; existing project raster assets; existing preference/profile UI patterns.
Kapsam: business home/profile, club profile, business onboarding feature files, working docs ve validation. Supabase schema, auth routing, scanner-only redirect veya yeni generated image dosyasi zorunlu degil.
Cikti: Strict TS/TSX patch ve validation raporu.
Yasaklar: global onboarding state yok, `any` yok, silent SecureStore failure ile onboarding'i saklamak yok, profile tab navigasyonunu kaldirmak yok, unrelated dirty changes yok.
Standartlar: AGENTS.md, existing mobile design system, imagegen skill save-path guidance when new bitmap generation is needed, minimal focused diff.

## Business Onboarding + Organizer Profile Exit Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Mobile/Admin Runtime Fix Slice)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Close the current mobile/admin runtime defects without broad refactors or unsafe data deletion.

## Mobile/Admin Runtime Fix Architectural Decisions

- Disable the native driver only for app-owned React Native `Animated` surfaces that currently use it, instead of suppressing `onAnimatedValueUpdate` with `LogBox`.
- Keep the profile notification registered state represented by the existing `Ready` pill and omit the redundant summary line only for the registered state.
- Add `Y-tunnus` to the admin manual business account form and route payload, then write both `p_y_tunnus` and `p_owner_name` into `businesses.y_tunnus` / `businesses.contact_person_name` through the atomic RPC.
- Preserve the current admin-created auth-user rollback behavior if the database RPC fails.
- Add a visible mobile organizer Delete action. Draft events are permanently deleted through the existing draft delete mutation; published/active events use the existing cancellation mutation because hard-deleting operational event history would violate the product invariants.

## Mobile/Admin Runtime Fix Edge Cases

- Empty `Y-tunnus` should stay optional and persist as `null`; mobile profile editing can still fill it later.
- Existing business owner creation must continue to reject reused emails and roll back newly created auth users on DB failure.
- Event hard delete must remain limited to drafts because published/active events can already have registrations, stamps, rewards, claims, announcements, and audit records.
- Animation changes should not remove visual affordances; they only move custom animations off the native animated event channel that is producing warnings.

## Mobile/Admin Runtime Fix Prompt

Sen Expo React Native runtime engineer, Next.js admin engineer ve Supabase RPC güvenlik reviewer olarak calisiyorsun.
Hedef: Mobil warning, profil kopyasi, admin-created business profile data mapping ve organizer event delete gorunurlugu problemlerini minimal ve guvenli sekilde duzelt.
Mimari: App-owned Animated native driver kapatma; profile summary conditional render; admin form/API/RPC typed payload; draft hard-delete + published/active safe-delete UI.
Kapsam: mobile profile/events/animation owners, admin manual business account form/route, Supabase migration, working docs ve validation. Auth provider, unrelated dirty changes, event history hard-delete veya warning suppression yok.
Cikti: Strict TS/TSX/SQL patch ve validation raporu.
Yasaklar: `LogBox.ignoreLogs` yok, `any` yok, silent RPC fallback yok, published/active event hard-delete yok, service-role secret loglamak yok.
Standartlar: AGENTS.md, master plan event-history invariants, explicit errors, minimal focused diff.

## Mobile/Admin Runtime Fix Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Android Release Smoke + Hosted Login Content Gate)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Convert the Android release smoke finding into a repeatable store-readiness gate so hosted placeholder login slide content cannot silently ship.

## Android Release Smoke + Hosted Login Content Gate Architectural Decisions

- Use SDK-local `adb`/`emulator` paths for validation only; do not modify global shell configuration.
- Treat local release APK launch as runtime smoke, not as a Play Store signing/upload proof.
- Extend `audit:store-release-readiness` to read active hosted `login_slides` through the public Supabase REST API using mobile public env values.
- Fail the store gate when active hosted mobile login slides contain placeholder/test copy or missing Finnish/English localized copy.
- Keep active-slide absence acceptable because the mobile app has local fallback onboarding slides; active hosted rows must be launch-ready.
- Clean the current hosted placeholder row by deactivating it, letting the safe local fallback render until proper launch copy is created in admin.

## Android Release Smoke + Hosted Login Content Gate Edge Cases

- Supabase REST responses are hosted content and must be treated as untrusted data; validation should report row ids/field names, not execute or echo full content.
- A publishable Supabase key is not a service-role secret, but the audit must still avoid logging key values.
- Device/emulator smoke proves launch/privacy/login entry only; Google OAuth, camera QR, and push delivery still require credentialed device flows.
- A local debug-signed APK is not the Play upload artifact. EAS production AAB/signing remains the store submission path.

## Android Release Smoke + Hosted Login Content Gate Prompt

Sen Android emulator QA, Expo release engineer, Codex Security reviewer ve ECC launch-readiness engineer olarak calisiyorsun.
Hedef: Android release APK runtime smoke sirasinda gorulen hosted placeholder mobile login slide icerigini tekrarlanabilir store-readiness gate ile yakala ve mevcut placeholder row'u public launch icin devre disi birak.
Mimari: SDK-local adb/emulator smoke; Supabase public REST active login slide read; placeholder/localized-copy validator; store-readiness audit regression gate; hosted data cleanup.
Kapsam: mobile audit script, docs/working notes, hosted `login_slides` data cleanup ve validation. Yeni slider tasarimi, store submit, OAuth/camera/push credential smoke veya unrelated dirty changes yok.
Cikti: JS/docs patch, hosted data cleanup kaniti ve validation raporu.
Yasaklar: service-role key loglamak yok, hosted content'i trusted kabul etmek yok, placeholder active slide ile audit'i yesil birakmak yok, local APK'yi Play-ready signed artifact gibi gostermek yok.
Standartlar: AGENTS.md, explicit failure messages, minimal focused diff, store credential gerektiren adimlari risk olarak raporla.

## Android Release Smoke + Hosted Login Content Gate Validation Plan

- `~/Library/Android/sdk/platform-tools/adb devices`
- `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:assembleRelease`
- `adb install -r app-release.apk`
- `adb shell am start -n fi.omaleima.mobile/.MainActivity`
- `adb logcat -d -b crash`
- `adb exec-out uiautomator dump /dev/tty`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Focused `git --no-pager diff --check`

## Current Plan (iOS Native Release Sync Gate)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make local iOS native release readiness catch stale generated privacy manifests and prove the current iOS workspace compiles in Release for simulator.

## iOS Native Release Sync Gate Architectural Decisions

- Keep `apps/mobile/app.config.ts` as the only tracked source-of-truth for iOS privacy manifests.
- Extend `audit:store-release-readiness` so generated `ios/OmaLeima/PrivacyInfo.xcprivacy` is optional on clean clones but, when present, must contain the same key app-level collected-data disclosures.
- Extend `audit:store-release-readiness` so generated `ios/Podfile.lock` fails when it still points to the stale nested ExpoCrypto path that breaks local Release builds.
- Add a store-build-only Expo config plugin that strips Expo Dev Client Bonjour/local-network plist metadata from preview/production generated native projects without changing development builds.
- Keep scanner location permission to iOS When In Use only and make the audit fail if Always/background location keys reappear.
- Use `npx expo prebuild --platform ios --no-install` to sync the ignored generated iOS project after changing Expo config.
- Run `pod install` after store prebuild so generated native Pods match the current package graph before Xcode Release validation.
- Use Xcode workspace + `OmaLeima` scheme for a Release simulator compile proof; do not require App Store Connect credentials or signing for this local gate.
- Document that local native iOS builds must run prebuild after privacy/config changes.

## iOS Native Release Sync Gate Edge Cases

- Clean CI or EAS environments may not have a generated `ios/` directory before prebuild; the audit should not fail solely because the ignored native directory is absent.
- A stale generated `PrivacyInfo.xcprivacy` is a real local release risk and should fail when present.
- A stale generated `Podfile.lock` is a real local Xcode build risk and should fail when present.
- Expo Dev Client local-network keys are acceptable in development builds but should not be shipped in store preview/production builds.
- Scanner fraud-review location should not silently escalate to Always or background location.
- Release simulator compile is not the same as App Store archive/upload; it proves Xcode compile/link health without Apple signing credentials.
- Physical device OAuth/camera/push smoke still remains separate from this compile/readiness gate.

## iOS Native Release Sync Gate Prompt

Sen Expo/iOS release engineer, Xcode build QA ve Codex Security privacy reviewer olarak calisiyorsun.
Hedef: iOS native generated project'in Expo privacy manifest source-of-truth ile senkron olmadigi durumu yakala ve current workspace'in Release simulator build ile derlendigini kanitla.
Mimari: `app.config.ts` source-of-truth; optional generated iOS privacy manifest and Pods alignment checks; store-build plist hygiene config plugin; Expo prebuild sync; CocoaPods install; Xcode workspace Release simulator compile.
Kapsam: mobile store-readiness audit, docs/working notes ve local generated native sync/build validation. Apple provider ekleme, App Store Connect submit, physical-device UI smoke veya unrelated dirty changes yok.
Cikti: JS/docs patch ve validation raporu.
Yasaklar: ignored generated dosyayi tek source-of-truth yapmak yok, stale manifest'i sessiz gecmek yok, signing/store-console durumunu kanitlanmis gibi gostermek yok.
Standartlar: AGENTS.md, Expo deployment guidance, Build iOS plugin guidance, explicit failure messages, minimal focused diff.

## iOS Native Release Sync Gate Validation Plan

- `npm --prefix apps/mobile run audit:store-release-readiness` before prebuild should expose stale generated iOS privacy manifest when present.
- `npx expo prebuild --platform ios --no-install`
- `pod install`
- `plutil -p apps/mobile/ios/OmaLeima/PrivacyInfo.xcprivacy`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `xcodebuild -workspace apps/mobile/ios/OmaLeima.xcworkspace -scheme OmaLeima -configuration Release -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.4' build`
- `plutil -p /tmp/omaleima-ios-release-derived/Build/Products/Release-iphonesimulator/OmaLeima.app/Info.plist`
- `plutil -p /tmp/omaleima-ios-release-derived/Build/Products/Release-iphonesimulator/OmaLeima.app/PrivacyInfo.xcprivacy`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npx expo-doctor`
- Focused `git --no-pager diff --check`

## Current Plan (Store Permission Hygiene Sweep)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Remove avoidable Android store-review friction and make the mobile store-readiness gate catch sensitive permission regressions.

## Store Permission Hygiene Sweep Architectural Decisions

- Use Expo `android.blockedPermissions` as the source-of-truth control so prebuild/EAS native generation removes sensitive overlay and microphone permissions that are not core app functionality.
- Keep the checked-in Android manifest aligned by replacing the existing `SYSTEM_ALERT_WINDOW` permission with a `tools:node="remove"` removal entry.
- Disable Android backup through Expo config and the checked-in manifest because mobile auth/scanner state is not meant to be restored between devices by Android backup.
- Extend `audit:store-release-readiness` so native policy readiness fails when overlay permission blocking or Android backup posture regresses.
- Use Expo's package resolver to align SDK 55 packages reported by Expo Doctor instead of hand-editing version ranges.
- Document the new Android permission hygiene expectation in testing and launch notes.

## Store Permission Hygiene Sweep Edge Cases

- Expo Dev Launcher can still require local-network development keys on iOS Debug builds; production release builds strip its own keys via the existing Expo build phase.
- The app still legitimately needs camera, notifications, photo-library, and optional scanner location permission text.
- Store-console state, final uploaded AAB target API, Sign in with Apple setup, and physical-device push/camera/OAuth smoke remain outside repo-owned validation.

## Store Permission Hygiene Sweep Prompt

Sen Codex Security, Expo release, Android Play readiness, iOS release-readiness ve ECC QA engineer olarak calisiyorsun.
Hedef: Google Play/App Store oncesi repo-owned native policy hygiene eksiklerini kapat; ozellikle Android hassas overlay permission ve backup posture tekrar kacmasin.
Mimari: Expo config source of truth; checked-in native manifest alignment; store-readiness audit regression gate; docs/runbook update.
Kapsam: `apps/mobile/app.config.ts`, Android manifest, store-readiness audit script, docs/working notes ve validation. Auth provider ekleme, UI refactor, store-console credential, physical-device smoke veya unrelated dirty changes yok.
Cikti: strict JS/TS/config patch ve validation raporu.
Yasaklar: sensitive permission'i sadece dokumante edip birakmak yok, silent audit pass yok, Apple login eklemek yok, cihaz/store credential gerektiren adimlari tamamlanmis gibi gostermek yok.
Standartlar: AGENTS.md, Expo plugin guidance, Codex Security explicit risk handling, minimal focused diff.

## Store Permission Hygiene Sweep Validation Plan

- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npx expo-doctor`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `npm --prefix apps/mobile run audit:native-push-device-readiness`
- `npm --prefix apps/mobile run audit:hosted-business-scan-readiness`
- `npm --prefix apps/mobile run audit:realtime-readiness`
- `adb devices` if `adb` is available, otherwise record the environment blocker.
- `xcrun simctl list devices available` for iOS simulator availability.
- Focused `git --no-pager diff --check`

## Current Plan (iOS Privacy Manifest Source-Of-Truth)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make iOS privacy manifest collected-data disclosure explicit and reproducible through Expo config before App Store builds.

## iOS Privacy Manifest Source-Of-Truth Architectural Decisions

- Use `ios.privacyManifests` in `apps/mobile/app.config.ts` instead of editing ignored generated iOS files.
- Preserve required-reason API declarations already present in the generated native manifest by declaring them in the Expo config source-of-truth as well.
- Add collected data types that map to current OmaLeima app functionality: account/contact info, user identifier, device identifier/push token, scanner location, photos/videos, customer support, and event/leima/reward interactions.
- Mark all declared collection as linked to the user, not tracking, and for app functionality only.
- Extend `audit:store-release-readiness` to fail when the iOS privacy manifest source-of-truth or key collected-data types are missing.

## iOS Privacy Manifest Source-Of-Truth Edge Cases

- App Store Connect privacy nutrition labels still must be completed manually and should match the native manifest and public privacy notice.
- Third-party SDK manifests remain owned by their SDK packages; the app manifest covers app-level collection controlled by OmaLeima.
- If Apple login is not added, the existing Google-only App Store policy risk remains documented and intentionally open.

## iOS Privacy Manifest Source-Of-Truth Prompt

Sen Expo/iOS release engineer ve Codex Security privacy reviewer olarak calisiyorsun.
Hedef: OmaLeima'nin iOS privacy manifest collected-data disclosure'ini Expo config source-of-truth uzerinden App Store buildlerine tasimak.
Mimari: `ios.privacyManifests` config; required-reason API declarations korunur; collected data types app functionality only; store-readiness audit regression gate.
Kapsam: `apps/mobile/app.config.ts`, store-readiness audit, docs/working notes ve validation. Apple login ekleme, App Store Connect form doldurma, generated ignored iOS dosyasini source-of-truth yapmak veya unrelated UI degisikligi yok.
Cikti: strict typed Expo config patch ve validation raporu.
Yasaklar: bos `NSPrivacyCollectedDataTypes` ile devam etmek yok, tracking purpose eklemek yok, store-console durumunu kanitlanmis gibi gostermek yok.
Standartlar: AGENTS.md, Apple privacy manifest guidance, Expo config-types, minimal focused diff.

## iOS Privacy Manifest Source-Of-Truth Validation Plan

- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npx expo-doctor`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm run qa:mobile-store-release-readiness`
- Focused `git --no-pager diff --check`

## Current Plan (Mobile Login Slider Target Fix)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make admin-managed login slider records render on mobile login, not on the web admin login page.

## Mobile Login Slider Target Fix Architectural Decisions

- Keep `/admin/login-slides` as the management surface and `public.login_slides` as the source of truth.
- Restore web `/login` to the static fallback slide by passing `loginSlideFallbackRecords` and removing the active DB slide query from the admin login page.
- Add a mobile-only read helper for active login slides using the existing mobile Supabase client and strict row mapping.
- Render mobile remote slides in `LoginHero` with localized Finnish/English copy selected by the current app language.
- Keep local onboarding slides as the empty-state baseline when there are no active records; show a small explicit error when the active-slide query fails.

## Mobile Login Slider Target Fix Edge Cases

- Admin-created image URLs are absolute public Supabase Storage URLs and should render as remote image sources in React Native.
- If a remote image fails to load, `CoverImageSurface` should continue to use the existing local fallback cover underneath it.
- Language changes should switch the text for already-loaded remote slides without refetching.
- Web admin login should not show mobile-managed slides anymore, even when active records exist.

## Mobile Login Slider Target Fix Prompt

Sen Expo React Native ve Next.js App Router engineer olarak calisiyorsun.
Hedef: Admin panelde yonetilen login slider icerigini mobil login hero'da goster; web admin login sayfasini eski static fallback gorseline dondur.
Mimari: `login_slides` DB source of truth; web login static fallback records; mobile Supabase public read helper; localized mobile hero mapping.
Kapsam: `apps/admin/src/app/login/page.tsx`, mobile login hero/read helper, working docs ve validation. Admin management CRUD, DB schema, storage upload/delete veya unrelated dirty changes yok.
Cikti: strict typed TS/TSX patch, admin/mobile validation raporu.
Yasaklar: sessiz fetch hatasi yok, `any` yok, web admin login'de active DB slider render etmek yok, yeni backend endpoint yok.
Standartlar: AGENTS.md, Next local docs, explicit error handling, minimal focused diff.

## Mobile Login Slider Target Fix Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check`

## Current Plan (Dashboard Browser Smoke Coverage)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Turn the next feasible release risk into automation by adding a real browser smoke for admin and organizer dashboard navigation plus locale switching.

## Dashboard Browser Smoke Coverage Architectural Decisions

- Reuse the existing Playwright browser smoke helper instead of introducing a new test framework or standalone Playwright config.
- Stabilize the shared sign-in helper around invariant UI: password panel heading and an explicit dashboard locale cookie.
- Add one focused script that signs in as seeded admin and seeded organizer, clicks critical sidebar routes, exercises locale switch from English to Finnish and back, and signs out.
- Collect browser console errors and page errors during the smoke; fail on actual runtime errors instead of silently passing a broken UI.
- Keep the smoke local-only through existing prerequisites: seeded local Supabase and a running local Next app.

## Dashboard Browser Smoke Coverage Edge Cases

- Login slide copy can change from the admin panel, so browser login smoke must not rely on slide title text.
- Locale switch changes sidebar labels, so the smoke should switch back to English before continuing with English route labels.
- Organizer reward-management links can depend on membership capability; seeded organizer route smoke already proves those links exist locally, and the browser smoke should exercise the same current seeded surface.
- The script must not mutate admin/organizer production data or send seeded credentials to hosted targets.

## Dashboard Browser Smoke Coverage Prompt

Sen ECC browser QA ve Playwright E2E engineer olarak calisiyorsun.
Hedef: Seeded local admin ve organizer hesaplariyla dashboard browser smoke kapsamini artir; sidebar navigation, locale switch ve sign-out gercek browserda dogrulansin.
Mimari: mevcut `_shared/browser-smoke` helper reuse; deterministic English locale cookie; console/pageerror collector; tek odakli `smoke:dashboard-browser` script.
Kapsam: admin scripts/shared helper, package script, testing docs ve working docs. UI davranisini degistiren component refactor, production credential smoke, mobile device smoke veya unrelated dirty changes yok.
Cikti: strict typed TS browser smoke, validation raporu.
Yasaklar: flaky arbitrary sleep yok, `any` yok, hosted seeded credential yok, login slide copy'ye bagimli assertion yok.
Standartlar: AGENTS.md, ECC browser-qa/e2e-testing guidance, explicit validation, minimal focused diff.

## Dashboard Browser Smoke Coverage Validation Plan

- Start local admin app on a non-conflicting port.
- `ADMIN_APP_BASE_URL=http://localhost:<port> npm --prefix apps/admin run smoke:dashboard-browser`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`

## Current Plan (Supabase Lint + Local QA Hygiene)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Keep the current local release-smoke stack reproducible by removing the last Supabase lint warning and documenting the pinned CLI setup path.

## Supabase Lint + Local QA Hygiene Architectural Decisions

- Add a new corrective migration instead of editing already-applied migration semantics for production environments.
- Preserve `create_business_owner_access_atomic` behavior exactly: same inputs, same access checks, same update/insert/audit behavior, and same JSON statuses.
- Replace the unused profile row variable with a `PERFORM ... FOR UPDATE` existence/lock check so `plpgsql_check` no longer reports an unread variable.
- Update local testing docs to recommend Supabase CLI `2.98.2` for this repository's current migration chain.
- Do not broaden this slice into a full migration-history rewrite or native device smoke. iOS/Android remain device/runtime environment checks after repo gates are clean.

## Supabase Lint + Local QA Hygiene Edge Cases

- Missing owner profile must still return `OWNER_PROFILE_NOT_FOUND`.
- Existing business owner access creation must remain idempotent through the existing `business_staff` conflict update.
- Local smoke setup should not ask developers to send seeded credentials to hosted environments.
- Documentation must keep clean reset available for isolated environments, but the practical current workstation path should be explicit.

## Supabase Lint + Local QA Hygiene Prompt

Sen Supabase security/release QA engineer, Expo readiness reviewer, iOS/Android smoke coordinator ve Next.js QA engineer olarak calisiyorsun.
Hedef: Local Supabase `db lint` uyarisini davranis degistirmeden kapat ve local QA dokumanini current Supabase CLI `2.98.2` akisi ile hizala.
Mimari: corrective SQL migration; existing RPC contract korunur; docs-only local setup clarification; repo-owned validation komutlari tekrar kosulur.
Kapsam: Supabase migration, testing docs, working docs ve validation. Auth provider, UI, QR semantics, native build/device smoke veya unrelated dirty changes yok.
Cikti: SQL/doc patch, temiz `db lint`, admin/mobile release gate validation raporu.
Yasaklar: legacy owner recovery flow'u yeniden acmak yok, function behavior degistirmek yok, ad-hoc schema patch yok, hosted credential/device smoke'u pass gibi gostermek yok.
Standartlar: AGENTS.md, explicit errors, minimal focused diff, security-definer contract korunur.

## Supabase Lint + Local QA Hygiene Validation Plan

- `npx --yes supabase@2.98.2 migration up --local`
- `npx --yes supabase@2.98.2 db lint --local`
- `npm --prefix apps/admin run smoke:auth`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `adb devices` and XcodeBuildMCP simulator discovery to report remaining native environment blockers truthfully.
- Focused `git --no-pager diff --check`

## Current Plan (Local Migration Parser Unblock)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Let local Supabase apply the pending migration chain so admin route smoke can validate the current app schema.

## Local Migration Parser Unblock Architectural Decisions

- Keep the scanner provisioning SQL semantics unchanged.
- Split the parser-fragile scanner provisioning function DDL into immediate follow-up migrations so each `CREATE FUNCTION` is the final command in its file.
- Keep PL/pgSQL function bodies unchanged apart from delimiter normalization.
- Do not skip the migration, edit migration history manually, or insert ad-hoc local schema outside the migration chain.
- Make local seed Auth user creation tolerant of both supported self-hosted Auth schema shapes so smoke users can be recreated after a reset/rebuild.
- After the parser unblock, rerun `supabase migration up --local` and continue with route smoke validation.

## Local Migration Parser Unblock Edge Cases

- Re-running the migration should remain idempotent for the already-applied earlier statements because the migration did not record as applied after the failure.
- Follow-up migration timestamps must sort before later scanner provisioning migrations so dependent changes still apply in order.
- Function bodies must not contain a literal `$$`; otherwise delimiter normalization would be unsafe.
- Hosted production was previously patched through targeted deployments/migrations, so this change is for repository-local reproducibility and future fresh environments.
- Seed should create deterministic local smoke users through `auth.users` for older and newer Supabase Auth schemas, and only seed `auth.identities` when that table exists.

## Local Migration Parser Unblock Prompt

Sen Supabase migration ve Build Web Apps release QA engineer olarak calisiyorsun.
Hedef: Local Supabase migration zincirinin `20260506072253_business_scanner_qr_provisioning.sql` parser hatasinda durmasini engelle.
Mimari: Fonksiyon mantigini degistirmeden custom dollar-quote delimiter'lari `$$` ile degistir; migration history'yi elle degistirme; local migration up ile dogrula.
Kapsam: Ilgili migration dosyasi, working docs ve local migration/smoke validation. DB reset, production schema ad-hoc patch, scanner logic refactor veya unrelated dirty changes yok.
Cikti: SQL-only parser compatibility patch ve validation raporu.
Yasaklar: Migration atlamak yok, manuel schema_migrations insert yok, fonksiyon davranisi degistirmek yok, `any` yok.
Standartlar: AGENTS.md, explicit validation, minimal focused diff.

## Local Migration Parser Unblock Validation Plan

- `supabase migration up --local`
- Direct DB check for latest schema objects such as `public.login_slides`
- `npm --prefix apps/admin run smoke:routes` against the local admin dev server
- Focused `git --no-pager diff --check`

## Current Plan (Smoke Auth Env Bootstrap)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Let `npm --prefix apps/admin run smoke:auth` use `apps/admin/.env.local` reliably before app env validation runs.

## Smoke Auth Env Bootstrap Architectural Decisions

- Keep the smoke script behavior and assertions unchanged.
- Replace the static `resolveAdminAccessByUserIdAsync` import with a dynamic import inside `run()` after `.env.local` has been loaded and required env values have been validated.
- Do not change production env validation. `src/lib/env.ts` should continue failing fast when required variables are missing in app runtime.
- Do not broaden this slice to all smoke scripts unless they reproduce the same eager app-env import issue.

## Smoke Auth Env Bootstrap Edge Cases

- Running from `apps/admin` and running via `npm --prefix apps/admin` should both load the same app-local env.
- Missing env should still produce explicit smoke script errors.
- The seeded account assertions should remain unchanged after the import timing fix.

## Smoke Auth Env Bootstrap Prompt

Sen Build Web Apps test-harness engineer ve Codex Security release QA olarak calisiyorsun.
Hedef: `smoke:auth` script'inin app-local env yuklenmeden app env validator import etmesini engelle.
Mimari: env load/validation once; app access helper dynamic import sonra; existing auth smoke assertions korunur.
Kapsam: `apps/admin/scripts/smoke-auth.ts`, working docs ve validation. Production env schema, auth access logic, database seed veya unrelated smoke scripts yok.
Cikti: strict typed TS patch, `smoke:auth` validation, focused diff-check.
Yasaklar: env validation'i gevsetmek yok, dummy fallback env yok, seeded credentials degistirmek yok.
Standartlar: AGENTS.md, explicit errors, minimal focused diff.

## Smoke Auth Env Bootstrap Validation Plan

- `npm --prefix apps/admin run smoke:auth`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- Focused `git --no-pager diff --check`

## Current Plan (PostCSS Advisory Hardening)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Remove the current PostCSS dependency advisory from admin and mobile dependency trees without downgrading Next.js or Expo.

## PostCSS Advisory Hardening Architectural Decisions

- Add explicit npm `overrides` for `postcss` in `apps/admin/package.json` and `apps/mobile/package.json`.
- Use the latest patched PostCSS 8 line already compatible with the affected toolchains instead of `npm audit fix --force`, because the force path proposes unrelated framework downgrades.
- Regenerate package-lock files through npm so the override is reproducible for CI and other developers.
- Keep runtime application code unchanged. This is a dependency hygiene/security slice only.

## PostCSS Advisory Hardening Edge Cases

- The override must not change app runtime behavior or introduce a major framework upgrade/downgrade.
- Admin and mobile dependency trees should each resolve `postcss` to the patched version after install.
- If a future Next/Expo release brings its own patched tree, the override can later be removed deliberately.

## PostCSS Advisory Hardening Prompt

Sen Codex Security dependency-audit engineer, Expo release engineer ve Next.js build engineer olarak calisiyorsun.
Hedef: Admin ve mobile npm audit ciktilarindaki PostCSS advisory'sini guvenli patch override ile kapat.
Mimari: workspace-level npm overrides; package-lock regeneration; audit/type/lint validation. Runtime app code yok.
Kapsam: `apps/admin/package.json`, `apps/admin/package-lock.json`, `apps/mobile/package.json`, `apps/mobile/package-lock.json`, working docs. Next/Expo major downgrade/upgrade, `npm audit fix --force`, UI veya backend logic degisikligi yok.
Cikti: deterministic dependency patch, validation raporu.
Yasaklar: force audit fix yok, framework downgrade yok, global dependency install yok, unrelated dirty changes revert yok.
Standartlar: AGENTS.md, explicit validation, minimal focused diff.

## PostCSS Advisory Hardening Validation Plan

- `npm --prefix apps/admin install --package-lock-only`
- `npm --prefix apps/mobile install --package-lock-only`
- `npm --prefix apps/admin audit --audit-level=moderate`
- `npm --prefix apps/mobile audit --audit-level=moderate`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Focused `git --no-pager diff --check`

## Current Plan (Route Smoke Harness Guard)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Stabilize the local admin route smoke so release checks distinguish missing prerequisites from real route regressions.

## Route Smoke Harness Guard Architectural Decisions

- Keep `smoke:routes` as a local seeded-stack smoke. Do not convert it into a hosted production smoke because hosted credentials and safer read-only browser checks already live in `smoke:hosted-admin-access`.
- Add an explicit local-host guard for `ADMIN_APP_BASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`. This prevents seeded test credentials from being sent to hosted targets by accident.
- Add a `/login` reachability preflight before the script signs in and checks protected routes. If it fails, return a clear start-command hint.
- Allow an escape hatch only through an explicit environment variable for rare preview/local-network use; default behavior stays safe and local.

## Route Smoke Harness Guard Edge Cases

- `localhost`, `127.0.0.1`, and IPv6 loopback should count as local.
- A local app returning framework 404 or a different service on port 3001 should fail before any sign-in attempt.
- Hosted route smoke must remain a separate credentialed script to avoid mutating or relying on seed accounts in production.

## Route Smoke Harness Guard Prompt

Sen Build Web Apps release QA ve Codex Security test-harness engineer olarak calisiyorsun.
Hedef: Admin `smoke:routes` script'inin local prerequisite eksikligini route bug'i gibi raporlamasini engelle.
Mimari: local-only URL guard; `/login` preflight; actionable error messages; existing route assertions and seeded accounts korunur.
Kapsam: `apps/admin/scripts/smoke-routes.ts`, docs/working notes ve validation. Hosted smoke davranisi, route guard logic, Supabase schema veya UI degisikligi yok.
Cikti: strict typed TS patch, smoke failure message proof, admin typecheck/lint validation.
Yasaklar: production seeded credential kullanimi yok, hosted smoke ile local smoke'u karistirmak yok, `any` yok, broad test refactor yok.
Standartlar: AGENTS.md, explicit errors, minimal focused diff.

## Route Smoke Harness Guard Validation Plan

- `npm --prefix apps/admin run smoke:routes` without local app should fail with the new actionable preflight message.
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- Focused `git --no-pager diff --check -- apps/admin/scripts/smoke-routes.ts REVIEW.md PLAN.md TODOS.md PROGRESS.md`

## Current Plan (Release Gate Security Hardening)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Close confirmed release/security gaps found by the plugin-guided sweep while keeping the broader pending worktree intact.

## Release Gate Security Hardening Architectural Decisions

- Keep the manual business account creation form as the only owner-account creation path. Remove the unused web transport helper and response type for the deprecated recovery-link flow.
- Make the legacy `admin-create-business-owner-access` Edge Function fail closed with `410 OWNER_ACCESS_FLOW_DEPRECATED`. This is safer than only deleting local code because a previously deployed remote function would otherwise keep accepting requests until explicitly replaced or removed.
- Tighten login slide URL validation to `http`/`https`, matching announcement media/CTA validation and avoiding non-web schemes in admin-managed CSS image URLs.
- Do not change auth providers, user onboarding semantics, or manual account creation in this slice.

## Release Gate Security Hardening Edge Cases

- Existing active login slides with normal HTTPS Supabase/public image URLs must continue to save and render.
- If the deprecated Edge Function is still called by a stale client, it must not create users, memberships, or recovery links.
- The deprecated web route should remain available as a clear 410 response so old UI/browser actions fail with an actionable status rather than a 404.

## Release Gate Security Hardening Prompt

Sen Codex Security, Expo release QA, iOS/Android readiness ve Next.js release engineer olarak calisiyorsun.
Hedef: Repo-owned release auditlerini calistir, credential/device gerektirmeyen bulgulari ayir, eski recovery-link owner access kapilarini fail-closed hale getir ve admin-managed login slide URL dogrulamasini sikilastir.
Mimari: legacy web route 410 kalir; legacy Edge Function 410 fail-closed dondurur; kullanilmayan owner-access web transport/type kaldirilir; login slide validation http/https helper kullanir.
Kapsam: `apps/admin` business application transport/types/login-slide validation, `supabase/functions/admin-create-business-owner-access`, working docs ve validation. Auth provider, manual business account form, unrelated dirty changes veya device/store-console smoke yok.
Cikti: strict typed TS/Edge Function patch, admin validation, deploy/apply status.
Yasaklar: recovery link uretmek yok, legacy kullanici devralma yok, `any` yok, credential gerektiren smoke'u pass gibi gostermek yok.
Standartlar: AGENTS.md, explicit errors, minimal focused diff, fail-closed security behavior.

## Release Gate Security Hardening Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npm --prefix apps/mobile run audit:realtime-readiness`
- `npm --prefix apps/mobile run audit:hosted-business-scan-readiness`
- `npm --prefix apps/mobile run audit:native-push-device-readiness`
- `npm --prefix apps/mobile run audit:reward-notification-bridge`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- Focused `git --no-pager diff --check -- <touched files>`

## Current Plan (Dashboard Navigation Latency)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Reduce admin/organizer dashboard page-switch and language-switch latency without weakening route protection or changing dashboard data semantics.

## Dashboard Navigation Latency Architectural Decisions

- Add a server-only cached current-access resolver using React `cache()`. Layouts and pages that need the current dashboard access should share this per-request result instead of each creating an independent auth/profile resolution path.
- Keep `resolveAdminAccessAsync(supabase)` available for route handlers and transport code that already owns a Supabase request client.
- Update `fetchClubEventContextAsync` to use the cached current access by default while still accepting an explicit access object when a caller already resolved it.
- Replace the dashboard locale `<Link>` to `/api/dashboard-locale` with a client button that writes the non-sensitive locale cookie and calls `router.refresh()` in a transition. Keep the existing API route as a safe fallback endpoint for old links/bookmarks.
- Do not cache page data snapshots globally. Navigation should still show fresh operational data; only duplicated current-session access work is deduped.

## Dashboard Navigation Latency Edge Cases

- Suspended/deleted users must still be blocked by layouts and pages after refresh/navigation.
- Admin users must still redirect away from `/club`, and organizer users must still redirect away from `/admin`.
- Language switching must preserve the current page and not trigger prefetch side effects.
- Client-side locale cookie writes must include `Secure` only on HTTPS so local HTTP development remains testable.

## Dashboard Navigation Latency Prompt

Sen Next.js App Router performance engineer olarak calisiyorsun.
Hedef: Admin ve organizator web panelinde sayfa gecisleri ve dil degistirme tiklamalarinda hissedilen 2-3 saniyelik gecikmeyi azalt.
Mimari: request-scoped cached current access resolver; layout/page duplicate auth/access sorgularinin tekillestirilmesi; locale switch icin client cookie + router.refresh; page snapshot sorgulari fresh kalir.
Kapsam: `apps/admin` dashboard auth/access, dashboard shell locale switch, club context ve ilgili admin/club page imports. DB schema, RLS, auth provider veya unrelated UI refactor yok.
Cikti: strict typed TS/TSX patch, admin typecheck/lint/build validation, production deploy if web runtime changes are made.
Yasaklar: yetki kontrolunu kaldirmak yok, stale global cache yok, sensitive cookie client'a tasimak yok, `any` yok.
Standartlar: AGENTS.md, explicit errors, minimal focused diff, route protection korunur.

## Dashboard Navigation Latency Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Production or local unauth smoke for route protection
- Focused `git --no-pager diff --check -- <touched files>`

## Current Plan (Organizer Mobile Actions + Localized Login Slides)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make organizer mobile event/announcement/profile controls behave visually and functionally as expected, and make admin-login slider slides support editable Finnish and English copy.

## Organizer Mobile Actions + Localized Login Slides Architectural Decisions

- Keep published/live event history safe. The mobile hard delete action remains a safe draft-delete flow, but visibility should recognize draft state from both stored status and timeline state.
- Center circular mobile `+` glyphs through text metrics (`height`, `width`, `lineHeight`, `textAlign`, `includeFontPadding`) instead of introducing a new icon dependency.
- Make the shared mobile language dropdown row borderless so it aligns inside existing profile preference sections. Keep the dropdown menu surfaced and bordered for discoverability.
- Add localized login-slide fields in Supabase while keeping legacy fields populated for compatibility. New admin saves write Finnish, English, and legacy canonical fields in one trusted upsert.
- Resolve the dashboard locale on the login page and render the active slide copy from the matching localized fields. Existing rows fall back to legacy copy until edited.

## Organizer Mobile Actions + Localized Login Slides Edge Cases

- A non-draft event must not be physically deleted from mobile because registrations, stamps, claims, and fraud/audit rows can reference it.
- Existing login-slide rows without localized columns populated should still render instead of falling back to the default slide.
- Login slide image upload/delete ownership behavior must not regress; only DB copy fields are changing in this slice.
- Admin preview should show the current dashboard locale copy but preserve both translation inputs while editing.

## Organizer Mobile Actions + Localized Login Slides Prompt

Sen Expo React Native organizer UX, Next.js admin UX ve Supabase migration engineer olarak calisiyorsun.
Hedef: Organizer mobil event aksiyonunda safe delete gorunurlugunu duzelt, events/announcements `+` ikonlarini ortala, profil language dropdown border/alignment sorununu duzelt, admin login slider CRUD'unu Fince ve Ingilizce metinlerle locale-aware hale getir.
Mimari: Mobile tarafinda mevcut action sheet ve preference component korunur; delete yalnizca draft-safe akista calisir; web tarafinda login_slides tablosuna localized copy kolonlari eklenir, read-model legacy fallback ile map eder, login page dashboard locale'e gore copy secer.
Kapsam: `apps/mobile`, `apps/admin`, Supabase migration, working docs ve ilgili validation. Published event hard-delete, auth/provider degisikligi veya unrelated refactor yok.
Cikti: strict typed TS/TSX/SQL, backward-compatible migration, validation raporu.
Yasaklar: non-draft event physical delete yok, sessiz fallback ile hatayi saklamak yok, `any` yok, storage cleanup davranisini bozmak yok.
Standartlar: AGENTS.md, explicit errors, focused diff, mevcut repo stiline uyum, deploy-oncesi type/lint/build kontrolleri.

## Organizer Mobile Actions + Localized Login Slides Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Supabase migration apply/list verification if hosted deploy is performed
- `git --no-pager diff --check -- <touched files>`

## Current Plan (Release Smoke + Cookie Consent Persistence)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Complete all practical repo-owned release checks available in this environment and make public website cookie acceptance persist across reload/navigation.

## Release Smoke + Cookie Consent Persistence Architectural Decisions

- Keep cookie consent as a client component because the footer settings button dispatches a browser event and the banner writes first-party consent cookies from the browser.
- Initialize the banner hidden until client mount determines whether a valid current-version consent cookie exists. This avoids server-rendered false positives where `document.cookie` cannot be read.
- On client mount, show the banner only when no current-version consent exists; otherwise sync the stored preference and keep it hidden.
- Validate through rendered browser interaction, admin/mobile build checks, store-readiness scripts, and production unauthenticated route smoke where credentials are not required.

## Release Smoke + Cookie Consent Persistence Edge Cases

- A stale consent cookie from an older version must still show the banner so the user accepts the current version.
- Footer cookie settings must continue to open the banner even after a valid consent cookie exists.
- Local HTTP development should not be treated as the final proof for `Secure` cookie persistence; production HTTPS browser smoke is the authoritative web check.
- Real device checks for camera, location, push delivery, Google OAuth, and native app-store metadata must remain marked as external/manual if no device or store credentials are available.

## Release Smoke + Cookie Consent Persistence Prompt

Sen Next.js public-site reliability engineer ve release QA lead olarak calisiyorsun.
Hedef: Web sitesinde `Hyväksy kaikki` cookie consent kabulunun reload/navigation sonrasinda kalici calismasini sagla ve ortamda yapilabilen admin/mobile release validation checklerini calistir.
Mimari: client-only cookie banner mount-time consent read; existing first-party consent cookie format korunur; Browser plugin ile rendered production/local interaction smoke; npm build/audit scripts ile repo-owned release checks.
Kapsam: `apps/admin/src/features/privacy`, working docs ve validation. Credential gerektiren admin mutation smoke, fiziksel cihaz camera/push/OAuth smoke veya App Store/Play Console dis sistemleri yok.
Cikti: strict typed TSX patch, browser proof, admin/mobile validation sonucu ve kalan manual risklerin net ayrimi.
Yasaklar: consent hatasini sadece UI copy ile gizlemek yok, cookie versiyon kontrolunu kaldirmak yok, unrelated dirty changes revert yok.
Standartlar: AGENTS.md, explicit validation, minimal focused diff.

## Release Smoke + Cookie Consent Persistence Validation Plan

- Browser plugin rendered smoke: production cookie accept -> reload -> banner hidden.
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- Focused `git --no-pager diff --check -- <touched files>`

## Current Plan (Mobile Privacy Modal + Language Dropdown + Organizer Edit Route)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make mobile legal/privacy access feel intentional instead of permanently occupying bottom space, make language switching a dropdown, and fix organizer upcoming edit routing so the edit form opens.

## Mobile Privacy Modal + Language Dropdown + Organizer Edit Route Architectural Decisions

- Keep the existing versioned mobile legal consent storage as the acknowledgement source of truth, but render the acknowledgement as a blocking modal when it is required.
- Keep legal links available from role profile screens through an explicit privacy/terms row that opens a modal, rather than showing a bottom card on every profile.
- Add one reusable language dropdown component under preferences and use it on login/profile surfaces instead of duplicating chip/modal language selectors.
- Make organizer event edit deep-link parsing tolerant of string-array params and route into edit mode from the resolved `requestedEventId`.
- Hide preview edit for completed/cancelled events so users are not sent to a non-editable event state.

## Mobile Privacy Modal + Language Dropdown + Organizer Edit Route Edge Cases

- If the device cannot open the legal URL, the modal should show the existing actionable error instead of silently doing nothing.
- If legal consent storage fails, login should keep the popup visible and show the save error.
- If an edit route targets an event that is not loaded yet, the events screen should wait for dashboard data rather than resetting to create mode.
- If an edit route targets a completed/cancelled event, the preview should not expose edit in the first place.

## Mobile Privacy Modal + Language Dropdown + Organizer Edit Route Prompt

Sen Expo React Native UX/runtime engineer olarak calisiyorsun.
Hedef: Mobilde privacy/terms alanini altta kalici kart yerine popup/modal akisi yap, dil degistirmeyi reusable dropdown'a tasi, organizator upcoming event edit gecisinin events edit formunu acmasini sagla.
Mimari: legal consent modal + legal links modal; shared preferences language dropdown; route-param tolerant organizer event edit opener.
Kapsam: `apps/mobile` legal, login/profile preferences ve organizer event navigation. Auth modeli, web legal sayfalari, store policy metinleri veya unrelated dirty changes yok.
Cikti: strict typed TSX patch, mobile typecheck/lint/export validation.
Yasaklar: `any` yok, silent fallback yok, unrelated revert yok, kalici bottom legal link UI yok.
Standartlar: AGENTS.md, Expo Router route conventions, minimal focused diff.

## Mobile Privacy Modal + Language Dropdown + Organizer Edit Route Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Focused `git --no-pager diff --check -- <touched files>`

## Current Plan (Organizer Delete + Media Cleanup + Login Slides)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Give organizers real mobile delete controls where safe, prevent owned storage images from accumulating after replacements, and make admin-login slider content editable from the admin panel.

## Organizer Delete + Media Cleanup + Login Slides Architectural Decisions

- Add mobile announcement hard delete through the same ownership principles as web: remove the owned `announcement-media` object first, then delete the row, and fail loudly if owned storage cleanup fails.
- Add mobile event delete only for draft/no-operational-history events. Published/live/cancelled event lifecycle should continue through cancel/archive semantics because physical deletes can break registrations, stamps, rewards, and audit trails.
- Centralize public Supabase Storage URL parsing and owned-object deletion helpers per app so every image replacement can compare old/new URLs and remove only objects owned by the expected bucket.
- Perform image replacement cleanup after the database update succeeds. This avoids losing the old displayed image if the save fails, while still surfacing cleanup failures with enough context.
- Add a `login_slides` table and `login-slider-media` bucket with platform-admin write access. The login page reads active slides, while an admin-only page manages order, text, image, active state, and deletion.
- Keep login-page fallback slides in code so login remains usable if no active slide exists or a migration has not been applied yet.

## Organizer Delete + Media Cleanup + Login Slides Edge Cases

- Deleting an announcement with an external image URL must not attempt to remove external storage.
- Deleting an event with registrations, stamps, claims, or reward history must be blocked with a clear message rather than forcing a cascade.
- Replacing a photo with the same URL should not remove anything.
- Storage cleanup should only delete objects in the expected Supabase bucket and owned path; malformed or external URLs should be ignored for deletion rather than treated as bucket paths.
- Login slider deletion should remove the owned slider image before deleting the row when the image belongs to the slider bucket.

## Organizer Delete + Media Cleanup + Login Slides Prompt

Sen Expo organizer mobile, Next.js admin UX ve Supabase Storage/Postgres engineer olarak calisiyorsun.
Hedef: Mobil organizator tarafinda announcement ve safe event delete aksiyonlarini ekle, tum fotograf replacement akislari icin eski owned bucket object cleanup sagla, admin panelden login slider fotograf/text yonetimini ekle.
Mimari: mobile feature mutations + shared storage cleanup helper; admin server/client routes + shared storage cleanup helper; Supabase migration with RLS/storage policies; login page fallback-safe active slide read-model.
Kapsam: `apps/mobile`, `apps/admin`, Supabase migration, working docs, validation. Operational event history hard-delete, unrelated UI redesign, external CDN image deletion veya auth-provider degisikligi yok.
Cikti: strict typed TS/TSX/SQL patches, admin/mobile validation, hosted migration/deploy plan if needed.
Yasaklar: `any` yok, storage hatasini sessiz yutmak yok, operational history cascade delete yok, unrelated dirty changes revert yok.
Standartlar: AGENTS.md, explicit errors, least privilege storage policies, minimal focused diff.

## Organizer Delete + Media Cleanup + Login Slides Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Supabase migration validation/apply path
- Focused `git --no-pager diff --check -- <touched files>`

## Current Plan (Mobile Haptics Crash Fix)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Stop organizer mobile event creation from redboxing when `expo-haptics` native methods are unavailable on the current iOS build.

## Mobile Haptics Crash Fix Prompt

Sen Expo React Native runtime reliability engineer olarak calisiyorsun.
Hedef: Native `expo-haptics` module unavailable oldugunda mobil event/create/action akislari crash etmesin.
Mimari: mevcut `safe-haptics` wrapper tek native haptics entrypoint olsun; ekranlar dogrudan `expo-haptics` cagirmasin.
Kapsam: `apps/mobile/src` icindeki direct haptics kullanimlari ve validation.
Cikti: TypeScript patch + `rg` kaniti + mobile validation.
Yasaklar: global warning suppress yok, native module yok sayan catch-all UI fallback yok, unrelated revert yok.
Standartlar: strict typing, minimal diff, explicit validation.

## Current Plan (Full Surface QA Sweep)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Deeply verify every admin/organizer web and student/organizer/business mobile surface for broken actions, no-op controls, logic mismatches, and release-blocking UX/runtime problems.

## Full Surface QA Sweep Architectural Decisions

- Split the review into five independent surfaces and use subagents for read-only deep audits while the main thread runs shared validation and integrates confirmed fixes.
- Treat rendered web behavior as more important than build-only proof. Use Playwright/browser tooling for page identity, non-blank render, route guard behavior, console health, and representative interactions where credentials are not required.
- Treat mobile repo audits as necessary but not sufficient. Run typecheck/lint/export/audit scripts, then inspect route/action code paths for controls that cannot be proven by static audits.
- Prefer minimal targeted fixes over broad refactors. Any confirmed issue must name the user-visible failure, affected action, root cause, and validation.
- Do not mutate hosted data or use destructive actions unless a route is explicitly designed as a smoke fixture. Production authenticated browser/device smoke remains a separate credential/device step when no safe fixture exists.

## Full Surface QA Sweep Edge Cases

- A button that visually exists but is disabled forever, calls a route with an impossible payload, or refreshes without state change counts as a broken control.
- Locale and pagination controls must preserve the selected record/action context or intentionally reset it with clear UX.
- Mobile role switching must not trap multi-role users in the wrong area or make scanner-only sessions escape their restricted mode.
- Scanner success/error mappings must match backend status codes and should not silently mark warning states as success.
- Delete/archive/status actions must either be real backend mutations or clearly named as lifecycle changes; fake UI-only actions are release blockers.

## Full Surface QA Sweep Prompt

Sen release QA lead, Next.js/Expo product engineer ve Supabase integration reviewer olarak calisiyorsun.
Hedef: Admin web, organizator web, student mobile, organizator mobile ve business/scanner mobile yuzeylerinde tum buton/action/flow mantigini kontrol et, kirik veya no-op davranislari bul ve dogrulanabilir minimal fixleri uygula.
Mimari: bes paralel read-only audit agent'i + ana thread validation/integration; web icin rendered Playwright smoke; mobile icin Expo typecheck/lint/export/audit + route/action code inspection; backend actionlar icin route/RPC validation.
Kapsam: `apps/admin`, `apps/mobile`, ilgili Supabase functions/migrations ve working docs. Gereksiz redesign, test fixture olmayan production data mutation, store-console dis sistemleri veya unrelated dirty changes yok.
Cikti: prioritized findings, strict typed fixes, validation/deploy report.
Yasaklar: tahmine dayali pass demek yok, broken actionlari sadece copy ile saklamak yok, hosted data'yi kontrolsuz silmek yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, explicit errors, minimal focused diff, RLS/role guard respect, E2E evidence-first QA.

## Full Surface QA Sweep Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Representative admin route/API smokes and unauth production route guards.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Mobile readiness audits: realtime, hosted scanner, push, reward notification, store release.
- Focused `git --no-pager diff --check -- <touched files>`

## Current Plan (Claims/Fraud/Announcement/Reward Delete Lifecycle)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make organizer operational screens visibly reliable, explain fraud review behavior, fix announcement push feedback, and add safe delete actions for announcements and rewards.

## Claims/Fraud/Announcement/Reward Delete Architectural Decisions

- Keep reward claim queue data server-scoped by selected event; fix the UX gap by making the selected event state visible, disabling the selected button, and explicitly tying queue/recent sections to the active event.
- Document fraud review in-product. Current fraud signals are generated from scanner-to-business distance anomalies, then reviewed through the existing atomic RPC; this slice should make that operationally obvious instead of changing fraud scoring rules.
- Keep announcement push delivery non-destructive. If every resolved recipient disabled the source, return an actionable no-recipient message with recipient counts rather than a vague failure.
- Add a hard announcement delete route that first removes the owned `announcement-media` storage object when the image URL belongs to that bucket, then deletes the announcement row. External image URLs are not removed.
- Implement reward delete as a dedicated `DELETED` lifecycle state through an atomic RPC, not a physical row delete, so historical reward claims and audit trails remain intact.
- Allow platform admins and organizer event editors to delete rewards through the same trusted lifecycle path.

## Claims/Fraud/Announcement/Reward Delete Edge Cases

- Clicking the already selected reward-claim event should not look broken; it should show a selected/disabled state.
- Recent claims and event queue must always describe which event they are filtered by.
- Fraud review should not imply device fingerprint or behavioral ML detection exists; today it detects scanner location distance anomalies only.
- Announcement image deletion must fail loudly before row deletion if the app owns the bucket object and storage removal fails.
- Reward delete must not break existing claims that reference a reward tier; deleted tiers should disappear from management/claimable lists but remain available for history.
- Push delivery may still fail when all devices have no tokens; that should stay explicit and not roll back the saved announcement.

## Claims/Fraud/Announcement/Reward Delete Prompt

Sen Next.js admin/organizer operations, Supabase Postgres/RPC ve Expo push delivery engineer olarak calisiyorsun.
Hedef: Organizer reward claims secili-event UX'ini netlestir, fraud review'un ne tespit ettigini panelde acikla, announcement push tercih hatasini aksiyon alinabilir yap, announcement hard delete ve reward safe delete lifecycle ekle.
Mimari: mevcut server snapshot/read-model korunur; UI state explicit hale gelir; announcement delete authenticated API + storage cleanup + DB delete sirasiyla calisir; reward delete Postgres atomic RPC ve `DELETED` status ile claim history'yi korur; push Edge Function recipient diagnostics'i genisletir.
Kapsam: `apps/admin`, Supabase migration, `send-announcement-push` Edge Function, working docs, hosted migration/function deploy ve validation. Fraud ML, full auth-user delete, claim-history cascade delete veya unrelated refactor yok.
Cikti: strict typed TS/TSX/SQL/Edge Function, deployable hosted changes, validation report.
Yasaklar: claim history'yi kiran physical reward delete yok, storage hatasini yutup DB row silmek yok, fraud kapsaminda olmayan tespitleri varmis gibi gostermek yok, `any` yok.
Standartlar: AGENTS.md, explicit errors, least privilege, short atomic DB mutations, minimal focused diff.

## Claims/Fraud/Announcement/Reward Delete Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Supabase migration apply/list verification
- `supabase functions deploy send-announcement-push --project-ref jwhdlcnfhrwdxptmoret`
- `git --no-pager diff --check -- <touched files>`

## Current Plan (Admin List Scale + Support Reply Push)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Keep admin moderation pages usable at scale, notify mobile users when support is answered, and add a safe admin account-deletion operation.

## Admin List Scale + Support Reply Push Architectural Decisions

- Add a small shared client pagination helper/component for admin panels instead of duplicating page math in every screen.
- Keep contact/support snapshots server-read and client-filtered for this slice; paginate the rendered filtered list so the page stays bounded.
- Improve `/admin/users` with local search, role filter, status filter, and page controls. Fetch profiles in database pages so the table is not capped at 500 rows.
- Treat admin delete as soft-delete/anonymization, not hard Supabase Auth deletion. Preserve event/leima/audit records, disable future access, disable device tokens/memberships, and remove profile department tag links.
- Extend the existing service-role `/api/admin/users/status` path and atomic RPC for `DELETED` so self-delete remains blocked and all related state changes happen in one transaction.
- Add a dedicated `send-support-reply-push` Edge Function that verifies a platform admin caller, reads the saved support reply, sends Expo push to enabled device tokens, records notification rows, and returns non-fatal no-token status.
- Invoke the support push after the reply RPC succeeds. The reply remains saved if a device has no token; transport failures are returned with context instead of being hidden.

## Admin List Scale + Support Reply Push Edge Cases

- Filter/search changes should reset the page to the first result and should not leave detail panes pointing at a hidden record.
- Empty filtered lists should show a clear empty state and disabled pagination rather than a blank table/list.
- Deleted users must not be activatable again from the admin UI; restoration should be a separate explicit recovery flow if ever needed.
- Deleting an account must not store the deleted user's previous email in audit metadata because that would defeat anonymization.
- Push notification delivery can be impossible when a user has no enabled device token; that should not roll back the saved support answer.

## Admin List Scale + Support Reply Push Prompt

Sen Next.js admin UX, Supabase Postgres/RPC ve Expo push notification engineer olarak calisiyorsun.
Hedef: Admin users/support/contact listelerini sayfalamali ve aranabilir hale getir, admin support cevaplarinda mobil push bildirimi gonder, admin users ekranina guvenli delete-account aksiyonu ekle.
Mimari: shared admin pagination component/helper; server snapshot + client-side filtered pagination; service-role verified admin API; atomic Postgres RPC for status/delete; Supabase Edge Function for Expo push delivery and notification log.
Kapsam: `apps/admin`, Supabase migration, support reply Edge Function, working docs, hosted migration/function deploy and validation. Full hard-delete, auth provider changes, background receipt polling veya unrelated refactor yok.
Cikti: strict typed TS/TSX/SQL/Edge Function, deployable hosted changes, validation report.
Yasaklar: hard cascade delete yok, profile email'i audit metadata'ya yazmak yok, hidden row limit yok, push transport hatalarini sessiz yutmak yok, `any` yok.
Standartlar: AGENTS.md, explicit errors, atomic mutations, RLS/service-role boundaries, minimal focused diff.

## Admin List Scale + Support Reply Push Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `supabase functions deploy send-support-reply-push --project-ref jwhdlcnfhrwdxptmoret`
- Supabase migration apply/list verification
- `git --no-pager diff --check -- <touched files>`

## Current Plan (Admin Operations Reliability + User Management)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Resolve the reported production bugs and add platform-admin account operations without weakening role/RLS boundaries.

## Admin Operations Reliability + User Management Architectural Decisions

- Keep public `apply` API behavior unchanged; fix the client-side false error by avoiding async access to the synthetic event target.
- Fix department-tag merge at the database trigger layer because profile tag synchronization must stay atomic with the merge decision.
- Keep dashboard locale as the existing httpOnly cookie, but prevent automatic route prefetch from mutating it and ensure organizer pages pass locale into their panels.
- Add a direct admin business-account creation form in the business applications page. It creates a business, auth user, profile, owner membership, and audit log from one API call with an explicit admin-provided password.
- Add `/admin/users` as the platform-admin user management table. Read data server-side, mutate status through a service-role route, and disallow self-suspension.
- Use `profiles.status = 'SUSPENDED'` for passive users. Do not delete auth users or profile rows in this slice.
- Add mobile realtime subscription to the current profile row and sign out when status changes away from `ACTIVE`.

## Admin Operations Reliability + User Management Edge Cases

- Business-account creation must reject duplicate email/business slug conflicts with actionable messages.
- Account status changes must not allow a platform admin to suspend their own current account.
- Suspended users may still authenticate at Supabase Auth level, but app/admin access guards must treat them as unsupported and mobile must sign out active sessions in realtime.
- Department tag merge must preserve at most one primary profile tag and must not leave duplicate profile-tag links.
- Locale switching should only happen on a deliberate click, never from route prefetch.

## Admin Operations Reliability + User Management Prompt

Sen Next.js admin operations, Supabase Postgres/RLS ve Expo session lifecycle engineer olarak calisiyorsun.
Hedef: apply false-error, department-tag merge failure, dashboard locale drift, manual business owner creation, admin user table/status management ve mobile realtime suspension logout problemlerini kok nedenle duzelt.
Mimari: public apply route korunur; DB trigger migration ile department tag sync atomic kalir; dashboard locale cookie korunur ama prefetch side-effect engellenir; admin API route'lari once platform admin session'i dogrular sonra service-role ile trusted mutation yapar; mobile profile status realtime subscription session provider'da calisir.
Kapsam: `apps/admin`, `apps/mobile`, Supabase migration, working docs ve validation/deploy. App Store auth provider, hard-delete user lifecycle, bulk import, email delivery sistemi veya unrelated dirty changes yok.
Cikti: strict typed TS/TSX/SQL, admin UI, mobile realtime logout, validation report ve hosted migration/deploy notu.
Yasaklar: client-side status update yok, RLS bypass'i admin session dogrulamadan kullanmak yok, admin self-suspend yok, error mesajlarini yutmak yok, `any` yok.
Standartlar: AGENTS.md, explicit errors, atomic DB changes, minimal focused slices, production smoke.

## Admin Operations Reliability + User Management Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Supabase migration apply/list verification
- Production smoke for public pages and unauth-protected admin mutation routes
- `git --no-pager diff --check -- <touched files>`

## Current Plan (Store Legal Links + Transient Form Success)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make repo-owned mobile store compliance surfaces easier to prove and make success messages transient without hiding the form.

## Store Legal Links + Transient Form Success Architectural Decisions

- Reuse the existing public legal pages: `https://omaleima.fi/privacy`, `https://omaleima.fi/terms`, `/en/privacy`, and `/en/terms`.
- Add one shared mobile legal-links card and render it on the unauthenticated login screen plus student, business, and club profile/settings screens.
- Keep account/data deletion initiation in the existing support request sheet; do not add a fake hard-delete flow in this slice.
- Make public `contact` and `apply` forms reset after successful submission, keep the form visible, and show inline success status for three seconds.
- Add a shared transient-success hook for visible admin/mobile action messages so success feedback clears after three seconds while errors stay visible.
- Extend `audit:store-release-readiness` to verify mobile in-app legal links and the public privacy deletion-request web resource.
- Do not implement Sign in with Apple in this slice because it needs Apple Developer/Supabase provider configuration outside the repo; keep it as a documented public iOS launch blocker.

## Store Legal Links + Transient Form Success Edge Cases

- Legal links must work before login and after login, so App Review can find them without special role navigation.
- If `Linking.canOpenURL` rejects a legal URL, the mobile UI should show a visible error instead of silently doing nothing.
- Successful form submissions should clear the form fields and anti-spam controls but leave the user on the form with a temporary confirmation.
- Success timers should only auto-dismiss success messages, not hide validation or server error messages.

## Store Legal Links + Transient Form Success Prompt

Sen Expo mobile store-compliance ve Next.js public-form UX engineer olarak calisiyorsun.
Hedef: Apple/Google tarafinda repo icinden kapatilabilir legal-link/deletion-resource eksiklerini tamamla ve public contact/apply formlarinda basari mesajini 3 saniyelik inline feedback haline getir.
Mimari: mevcut public legal sayfalari source-of-truth; shared mobile legal links card; mevcut support request deletion initiation; public form local submission state timer; admin/mobile transient success hook.
Kapsam: mobile legal link UI, store readiness audit/docs, public contact/apply form success behavior, high-visibility admin/mobile success notices, working docs ve validation. Apple Sign in provider kurulumu, App Store Connect/Google Play Console formlari veya backend hard-delete flow yok.
Cikti: strict typed TS/TSX/JS/doc updates, validation report, kalan external store blockers listesi.
Yasaklar: legal linkleri sadece web sitesinde birakmak yok, deletion request'i hard-delete gibi gostermek yok, success timer ile error mesajlarini silmek yok, unrelated dirty changes revert yok, `any` yok.
Standartlar: AGENTS.md, official Apple/Google policy references, minimal diff, accessible links and status messages.

## Store Legal Links + Transient Form Success Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `git --no-pager diff --check -- <touched files>`

## Current Plan (Admin Login Crash Recovery)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Restore admin web login/dashboard access and prevent one bad browser session from blocking the login page.

## Admin Login Crash Recovery Architectural Decisions

- Keep admin web authentication password-only after the earlier Google-button removal.
- Fix the admin dashboard data crash by selecting the owner profile through the explicit `business_staff_user_id_fkey` relationship.
- Add stale-session recovery in the Next proxy for missing/invalid Supabase refresh-token states.
- Clear only Supabase auth cookies (`sb-*`) and redirect to login with a session-expired marker.
- Continue throwing unexpected auth refresh errors so production failures remain visible.
- Do not implement Apple login in this slice; track it only as an iOS public App Store policy risk while the product decision is Google-only students.

## Admin Login Crash Recovery Edge Cases

- A browser with a deleted/revoked refresh token should regain access to `/login` without manually clearing site data.
- A valid admin session should continue to refresh normally.
- A platform admin viewing reviewed approved applications should see owner access status without PostgREST relationship ambiguity.
- A user rejected by role guards after login should not be converted into an anonymous session unless Supabase explicitly reports the auth cookie as stale/invalid.

## Admin Login Crash Recovery Prompt

Sen Next.js admin auth ve Supabase PostgREST read-model engineer olarak calisiyorsun.
Hedef: Admin password login sonrasi `/admin` server crash'ini ve stale refresh token sebebiyle login sayfasina geri donememe problemini kok nedenle duzelt.
Mimari: mevcut Supabase SSR proxy + admin read-model korunur; ambiguous embed explicit FK relationship ile cozulur; stale auth cookie recoverable session-expired redirect olarak ele alinir.
Kapsam: `apps/admin` auth proxy, business application read-model, working docs ve validation. Mobil auth, Supabase schema, Apple Sign in ekleme veya admin Google OAuth'u geri getirme yok.
Cikti: strict typed TypeScript diff, validation report, deploy notu.
Yasaklar: auth hatalarini genel catch-all ile yutmak yok, beklenmeyen Supabase hatalarini sessiz gecmek yok, unrelated dirty changes revert yok, `any` yok, Apple login implementasyonu yok.
Standartlar: AGENTS.md, explicit errors, minimal web-only diff, production log digest ile dogrulama.

## Admin Login Crash Recovery Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check -- apps/admin/src/lib/supabase/proxy.ts apps/admin/src/features/business-applications/read-model.ts PLAN.md REVIEW.md TODOS.md PROGRESS.md`

## Current Plan (Store Compliance + Leima Limit Semantics)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Make same-venue multi-leima behavior explicit and improve repo-owned App Store / Google Play policy readiness without changing scan persistence.

## Store Compliance + Leima Limit Architectural Decisions

- Preserve backend scan semantics: one accepted QR scan inserts one valid leima. `perBusinessLimit` remains the maximum valid count from the same business/venue for the event.
- Clarify this rule in organizer event creation/edit copy, web organizer rules copy, student event detail rule copy, and business scanner duplicate/limit feedback.
- Add account/data deletion request initiation through the existing mobile support request surface instead of adding a new deletion RPC in this slice.
- Expand the public privacy notice to cover the mobile app's current data categories and deletion request path.
- Harden the store readiness audit so it verifies the new policy-facing repo content while still documenting that Apple/Google console state is owner-owned.
- Document Sign in with Apple/equivalent login as an iOS public submission blocker because the current student primary login is Google.

## Store Compliance + Leima Limit Edge Cases

- A student with a same-venue limit of `3` should not receive three leimat from one QR because that would reduce auditability and make replay mistakes more damaging.
- If a scanner sees `ALREADY_STAMPED` with a higher configured limit, the copy should explain that the limit has been reached, not imply the first duplicate is always invalid.
- Account deletion requests may still require identity verification and retention of fraud/accounting/security records; the app should initiate the request, not promise immediate hard deletion of every audit record.
- Store readiness commands cannot prove App Store Connect, Google Play Console, EAS Submit credentials, final target SDK from a produced AAB, or Apple provider credentials.

## Store Compliance + Leima Limit Prompt

Sen Expo mobile, Next.js public legal copy ve store-compliance readiness engineer olarak calisiyorsun.
Hedef: Same-venue multi-leima kuralini netlestir, mobilde hesap/veri silme talebi baslatilabilir hale getir ve App Store/Google Play uygunluk risklerini repo audit/docs tarafinda gorunur yap.
Mimari: mevcut scan backend invariant korunur; mobile support request formu deletion-initiation yuzeyi olarak kullanilir; public privacy notice mevcut legal-content modeliyle genisletilir; store audit statik repo-owned kontrolleri genisletir.
Kapsam: copy/compliance surfaces, support sheet quick template, public privacy notice, store readiness script/docs, working docs ve validation. Scan RPC/Edge Function persistence, Supabase auth providers, Apple Sign in implementation ve hard-delete backend flow yok.
Cikti: strict typed TS/TSX/JS/doc updates, validation report, kalan store blockers listesi.
Yasaklar: tek scan ile coklu leima vermek yok, hesap silme talebini otomatik hard-delete gibi gostermek yok, store gate'te dis sistemleri kanitlanmis gibi yazmak yok, unrelated dirty changes revert yok, `any` yok.
Standartlar: AGENTS.md, official Apple/Google policy references, explicit limitations, minimal diff.

## Store Compliance + Leima Limit Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `git --no-pager diff --check`

## Current Plan (Mobile Runtime Warning Cleanup)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Remove repeated mobile runtime warnings without hiding real errors.

## Mobile Runtime Warning Architectural Decisions

- Install `expo-crypto` as a direct mobile dependency because the mobile app will import it directly.
- Add `src/lib/native-crypto-polyfill.ts` and import it before Supabase client creation.
- Keep the polyfill minimal: provide native `getRandomValues`, `randomUUID`, and `subtle.digest` only when the runtime does not already provide them.
- Keep web behavior unchanged so browser WebCrypto remains the source of truth on web.
- Add explicit `initialRouteName` values to Expo Router root stack, role tabs, and the nested student event stack.

## Mobile Runtime Warning Edge Cases

- If native runtime already exposes `crypto.subtle.digest`, the app should not override it.
- The digest bridge should reject unsupported algorithms explicitly rather than silently returning the wrong digest.
- Navigation initial routes must not change the actual auth redirects; guards still decide whether users land in student, business, club, or scanner areas.
- Scanner-only business users still redirect to `/business/scanner` after the business layout resolves access.

## Mobile Runtime Warning Prompt

Sen Expo React Native runtime/auth engineer olarak calisiyorsun.
Hedef: Mobile loglarda tekrar eden WebCrypto PKCE downgrade ve `onAnimatedValueUpdate` warning'lerini kok nedenle temizle.
Mimari: native-only Expo Crypto WebCrypto bridge + explicit Expo Router initial route declarations. Global LogBox suppress yok.
Kapsam: mobile dependency config, Supabase client bootstrap, app layout navigators, working docs ve validation. Supabase backend, admin web, auth behavior redesign veya broad animation rewrite yok.
Cikti: strict typed TS/TSX updates, package metadata update, mobile validation report.
Yasaklar: PKCE'yi `plain` olarak kabullenmek yok, warning suppress etmek yok, unrelated dirty changes revert yok, `any` yok.
Standartlar: AGENTS.md, Expo SDK 55 APIs, minimal diff, explicit runtime errors.

## Mobile Runtime Warning Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `git --no-pager diff --check`

## Current Plan (Announcement Partial Push Retry)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Align announcement push retry behavior with the admin UI promise that failed/partial deliveries can be retried.

## Announcement Partial Push Architectural Decisions

- Keep the existing Edge Function and Expo Push transport; no new queue/table/job system in this slice.
- Read previous notification attempts for the requested announcement only, using the notification payload announcement id.
- On the first send, target the full resolved audience as before.
- On retries, target only users that have a previous `FAILED` notification and no `SENT`/`READ` notification for the same announcement.
- Keep fully successful announcements blocked with `ANNOUNCEMENT_ALREADY_SENT`.
- Update the admin delivery read-model to roll up status by announcement and user, where a user-level success overrides older failed attempts for that user.
- Treat null-user legacy notification rows as untargetable attempts: show them in admin delivery state, but do not retry them through a full-audience resend.

## Announcement Partial Push Edge Cases

- A user with multiple device tokens counts as successful if any token delivery succeeds, matching the existing notification row model.
- Users who disabled push or no longer have an enabled device token can remain unresolved; the function should report the existing no-recipient/no-token errors instead of pretending success.
- New audience members added after the first send should not receive a retry that is meant only for failed recipients.
- Old `FAILED` rows should not keep a push in `PARTIAL` after the same user later has a `SENT` or `READ` row.
- Legacy null-user delivery rows cannot be mapped back to a recipient, so retry should fail closed instead of guessing.

## Announcement Partial Push Prompt

Sen Supabase Edge Function ve Next.js admin delivery-state engineer olarak calisiyorsun.
Hedef: Announcement push akisini partial/failed retry icin dogru hale getir; daha once basarili teslim alan kullanicilara tekrar push gitmesin, sadece basarisiz kalmis kullanicilar yeniden denensin.
Mimari: existing `send-announcement-push` Edge Function + `notifications` delivery log + admin read-model rollup. Yeni tablo, background job, Expo receipt polling veya broad UI redesign yok.
Kapsam: Edge Function retry filtering, admin delivery status aggregation, working docs ve validation. Mobile push routing, announcement compose UI ve Supabase schema degisikligi yok.
Cikti: strict typed TS updates, validation report, updated handoff.
Yasaklar: `any` yok, secret basmak yok, tum audience'a duplicate retry yok, eski basarili delivery satirlarini silmek yok, unrelated dirty changes revert yok.
Standartlar: AGENTS.md, explicit errors, minimal diff, existing push payload contract.

## Announcement Partial Push Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/admin run smoke:announcement-push`
- `git --no-pager diff --check`

## Current Plan (Auth Role Entry Cleanup)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Remove misleading web-admin Google login and let mobile multi-role accounts switch areas without weakening guards.

## Auth Role Entry Architectural Decisions

- Remove only the Google OAuth button/handler from `AdminLoginPanel`; keep password sign-in, password-session persistence, and Turnstile verification unchanged.
- Add a mobile SecureStore-backed preferred area helper and make `fetchSessionAccessAsync` choose the preferred area only when that area is actually available.
- Preserve scanner-only behavior by forcing scanner sessions to business/scanner mode and exposing no switch option.
- Add a shared `MobileRoleSwitchCard` component to role home screens. The component updates preference, invalidates `session-access`, and navigates to the selected area's home route.

## Auth Role Entry Edge Cases

- If a stored preferred area is no longer available, `session-access` must ignore it and return the existing safe default.
- Suspended/deleted profiles should remain unsupported regardless of stored preference.
- Business scanner-only devices should not show student/club switches even if stale preference exists.
- Removing Google from admin web should not touch mobile Google student login.

## Auth Role Entry Prompt

Sen Expo mobile auth/role UX ve Next.js admin auth engineer olarak calisiyorsun.
Hedef: Admin web login'deki Google giris butonunu kaldir ve mobilde multi-role hesaplarin ogrenci/isletme/organizer alanlari arasinda guvenli sekilde gecmesini sagla.
Mimari: Admin password-only panel + mobile SecureStore preferred area + `session-access` source-of-truth + shared role switch card.
Kapsam: admin login UI, mobile session-access, role switch component, role home screen entry points, working docs ve validation. Supabase schema, Edge Function, Google mobile student login ve broad redesign yok.
Cikti: strict typed TS/TSX updates, validation report, handoff.
Yasaklar: auth/RLS bypass yok, scanner-only mode'u gevsetmek yok, secret basmak yok, unrelated dirty changes revert yok, fallback ile sessiz hata yutma yok.
Standartlar: AGENTS.md, explicit role checks, minimal diff, existing auth/session patterns.

## Auth Role Entry Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Mobile Reward Claim Flow)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Implement the next release-critical mobile reward handoff flow without changing the reward database lifecycle.

## Mobile Reward Claim Architectural Decisions

- Add a mobile `club-claims` feature module that mirrors the proven web read-model shape, but uses the mobile Supabase client and React Query.
- Confirm handoff through the existing `claim-reward` Edge Function so authorization and inventory/race-condition checks stay centralized.
- Add a hidden `/club/claims` tab route and link to it from organizer home/upcoming contexts instead of crowding the bottom tab bar.
- Add student-facing handoff copy inside claimable reward tier rows; do not create a student-side pending claim mutation.

## Mobile Reward Claim Edge Cases

- Duplicate organizer taps must not create duplicate claims; the atomic RPC returns `REWARD_ALREADY_CLAIMED` and the UI refreshes the queue.
- Out-of-stock or already-claimed tiers should disappear from candidate calculation before confirmation, but Edge Function statuses still need to be displayed if stale UI submits.
- Organizer accounts with no active club membership should see an empty/error state, not a broken mutation form.
- Student handoff copy must not promise reservation; it only tells the student to show the claimable reward to staff.

## Mobile Reward Claim Prompt

Sen Expo React Native ve Supabase reward-handoff engineer olarak calisiyorsun.
Hedef: Mobile organizer icin claimable reward handoff confirmation ekle ve student claimable reward kartini staff'a gosterilebilir hale getir.
Mimari: mobile React Query read-model + existing `claim-reward` Edge Function mutation + hidden club route. Yeni tablo, pending queue veya RPC yok.
Kapsam: mobile club claims feature, route, organizer CTA, student reward card copy, working docs ve validation. Admin web, historical migrations, pricing, role switcher ve announcement retry yok.
Cikti: strict typed TS/TSX updates, mobile validation, updated handoff.
Yasaklar: `any` yok, secret basmak yok, fake fallback yok, duplicate claim'i client-only varsaymak yok, unrelated dirty copy changes revert yok.
Standartlar: AGENTS.md, atomik backend invariant, explicit errors, minimal release-focused diff.

## Mobile Reward Claim Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
- Existing admin/Supabase validation only if shared backend files change.

## Current Plan (Critical Pre-Release Fixes)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Fix the highest-confidence security and release-readiness issues found by the deep audit without starting broad feature work.

## Critical Fix Architectural Decisions

- Add a forward Supabase migration instead of editing historical migrations.
- Keep Edge Function service-role flows working; remove direct authenticated RPC execution where the app already uses Edge Functions.
- Keep club reward claims callable from the existing web route, but bind non-service callers to their own `auth.uid()`.
- Scope public child table reads through parent event visibility, while allowing registered students to read their own registered non-public event context.
- Keep mobile changes local to existing query/transport functions and avoid navigation or redesign work.

## Critical Fix Edge Cases

- Service-role Edge Functions may call RPCs without `auth.uid()`, so actor binding must exempt `auth.role() = 'service_role'`.
- Registered private/unlisted events should appear only to the registered student, not anonymous users.
- Business opportunities should disappear when the business city is unknown rather than showing every event in every city.
- Club staff should still see event history, but edit/cancel controls should be disabled unless the club membership can create/manage events.

## Critical Fix Prompt

Sen Supabase security, Expo mobile ve Next.js admin release engineer olarak calisiyorsun.
Hedef: Deep audit bulgularindan ilk kritik seti minimal diff ile duzelt: RPC actor-spoof riskleri, child-table RLS visibility leak, mobile scanner apikey eksigi, registered private event QR/reward kaybi, business city-scope ve unauthorized club staff edit controls.
Mimari: forward SQL migration + targeted TypeScript patches; existing Edge Functions, React Query hooks, route guards and UI patterns korunur.
Kapsam: yalnizca yukaridaki kritik fixler, working docs ve validation. Mobile reward-claim feature, full role switcher, announcement retry redesign, pricing, broad refactor yok.
Cikti: SQL migration, strict typed TS/TSX updates, validation results and updated handoff notes.
Yasaklar: secret basmak yok, unrelated dirty copy changes revert yok, fallback ile sessiz hata yutmak yok, `any` yok, historical migration rewrite yok.
Standartlar: AGENTS.md, strict typing, explicit errors, minimal risk-reducing changes, existing validation suite.

## Critical Fix Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `supabase db lint --local`
- Targeted QR/scan smoke with local anon key if function gateway key drift appears.
- Targeted admin route smoke where local server state allows.

## Current Plan (Pre-Release Code Review Refactor Sweep)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Begin the final broad review/refactor cycle before more product work.

## Pre-Release Sweep Architectural Decisions

- Keep this branch review-first: no broad rewrites and no cosmetic-only refactors.
- Partition review by runtime boundary: mobile app, admin/public web, Supabase database/RLS/RPC, and Supabase Edge Functions.
- Prioritize fixes that protect product invariants: role isolation, QR/stamp/reward integrity, scanner provisioning lifecycle, public intake gating, and push routing correctness.
- Use existing validation commands before any merge: mobile/admin typecheck/lint, admin build, Supabase lint, and targeted smoke scripts for touched surfaces.

## Pre-Release Sweep Edge Cases

- Anonymous scanner accounts use the authenticated Postgres role, so RLS policies must be reviewed as if anonymous sessions can reach authenticated policies until backend provisioning gates them.
- Scanner device deletion/revocation must preserve business statistics while removing access.
- Public contact/apply pages must remain server-side Turnstile-gated and should not regain direct anon Supabase write paths.
- Code review findings should distinguish real release blockers from acceptable future hardening.

## Pre-Release Sweep Prompt

Sen senior full-stack release reviewer, Supabase security reviewer ve Expo/Next.js refactor engineer olarak calisiyorsun.
Hedef: OmaLeima production V1 oncesinde mobil, web/admin ve Supabase yuzeylerinde gercek bug, security risk ve release-readiness eksiklerini bul; yalnizca risk azaltan minimal refactor/fixleri uygula.
Mimari: review-first branch; role-boundary shard'lari, RLS/RPC/Edge Function shard'lari, QR/stamp/reward invariant shard'i, public intake shard'i ve push/deep-link shard'i.
Kapsam: repo genelinde review, artifact/ledger, targeted validation ve gerekirse minimal fixes. Yeni urun ozelligi, pricing/Stripe geri ekleme, cosmetic redesign ve unrelated rewrite yok.
Cikti: ordered findings, risk-reducing patches if needed, validation report, updated working docs and handoff.
Yasaklar: `any` yok, secret basmak yok, fallback ile sessiz hata yutmak yok, user/unrelated changes revert yok, auth/RLS bypass yok.
Standartlar: AGENTS.md, Codex Security workflow, existing test strategy, explicit validation, small commits.

## Pre-Release Sweep Validation Plan

- Code-reviewer subagent broad review report.
- Codex Security repository-wide inventory and high-impact coverage ledger.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `supabase db lint --local`
- Targeted smoke scripts for any touched runtime area.

## Current Plan (Public Gallery Polish)

- **Date:** 2026-05-06
- **Branch:** `feature/public-gallery-polish`
- **Goal:** Commit, push, and deploy the remaining public website polish changes without mixing them into the upcoming broad review/refactor work.

## Public Gallery Polish Architectural Decisions

- Keep the gallery as static public assets rendered by the existing public landing page component.
- Reuse the current public-site CSS naming and `public-shell` layout system instead of introducing a new design system.
- Keep this branch presentation-only; no API, auth, Supabase, payment, or mobile changes.
- Validate through the admin app because the public website is hosted inside `apps/admin`.

## Public Gallery Polish Edge Cases

- Narrow mobile screens should render the gallery as two columns, not overflow horizontally.
- Large PNG assets should not break the production build; Next image optimization can serve them from the public folder.
- Finnish copy edits must preserve route labels, anchors, and search metadata intent.
- The upcoming repository-wide review/refactor must start from clean `main`, not from an uncommitted public-site diff.

## Public Gallery Polish Prompt

Sen Next.js public-site release engineer ve security-conscious frontend reviewer olarak calisiyorsun.
Hedef: mevcut worktree'deki public landing gallery/copy degisikliklerini izole branch'te validate et, commit/push et, main'e merge et ve Vercel production'a deploy et.
Mimari: `apps/admin` public-site componentleri + static public image assets; existing CSS layout utilities korunur.
Kapsam: sadece public website presentation diff'i, working docs, validation, git ve Vercel deploy. Auth, Supabase, Edge Functions, mobile ve pricing yok.
Cikti: strict TypeScript/CSS asset degisiklikleri, diff-scoped security sonucu, rendered homepage smoke, production deployment URL.
Yasaklar: secret basmak yok, unrelated branch/history revert yok, API/auth davranisi degistirmek yok, yeni payment/self-serve flow eklemek yok.
Standartlar: AGENTS.md, minimal diff, explicit validation, clean main before broad review/refactor.

## Public Gallery Polish Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- Diff-scoped Codex Security review.
- Rendered homepage smoke at desktop and mobile widths.
- Vercel production deploy and live HTTP smoke.

## Current Plan (Business Profile Event Count)

- **Date:** 2026-05-06
- **Branch:** `bug/business-profile-event-count`
- **Goal:** Make business profile event counts match the real scanner-ready joined events and validate the business mobile flow.

## Business Profile Event Count Architectural Decisions

- Reuse `useBusinessHomeOverviewQuery`; do not add a duplicate Supabase query.
- Compute active and upcoming joined event counts for `selectedMembership.businessId`.
- Render `Tapahtumat/Events` badge as active + upcoming joined event count because the destination page covers both live scanner queue and upcoming joined events.
- Keep the scanner button behavior based on active joined count only, because scanner is valid only for live events.

## Business Profile Event Count Edge Cases

- Multiple business memberships should not inflate the selected business profile count.
- Active-only situations should no longer show zero on the events button.
- Upcoming-only situations should still route to events instead of scanner.
- Completed joined events remain visible in `/business/events`, but they should not be counted as scanner/actionable profile events.

## Business Profile Event Count Prompt

Sen Expo React Native business scanner/profile akisi konusunda deneyimli bir mobil product engineer'sin.
Hedef: Business profile quick action'daki `Tapahtumat (...)` sayacini gercek selected-business active + upcoming joined event state'iyle hizala ve scanner akisini bozmadan dogrula.
Mimari: mevcut `businessHomeOverviewQuery` verisinden selected business icin turetilmis count; yeni Supabase query veya backend degisikligi yok.
Kapsam: business mobile profile count, working docs, validation, simulator/device readiness. Scanner RPC, event join RPC, Supabase schema ve admin web yok.
Cikti: strict typed TSX degisikligi, hosted data cross-check, mobile validation, simulator smoke raporu.
Yasaklar: fallback veri uydurma yok, scanner active gating'i genisletme yok, unrelated UI refactor yok, credential output/log yok.
Standartlar: AGENTS.md, minimal diff, explicit validation, business event state consistency.

## Business Profile Event Count Validation Plan

- Hosted SQL cross-check for active/upcoming joined event counts.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- iOS/Android simulator readiness checks where local tooling allows.
- `git --no-pager diff --check`

## Current Plan (Storage Bucket Listing Hardening)

- **Date:** 2026-05-06
- **Branch:** `feature/storage-bucket-listing-hardening`
- **Goal:** Remove public bucket listing exposure from Supabase media buckets while preserving public image delivery and existing upload/manage flows.

## Storage Bucket Listing Hardening Architectural Decisions

- Add a privilege-only migration that drops the three broad public SELECT policies on `storage.objects` for `announcement-media`, `business-media`, and `event-media`.
- Do not add replacement read policies because public buckets already serve known public object URLs and the application does not list these buckets from client/admin code.
- Keep authenticated upload/update/delete policies intact so organizer/admin media management behavior stays unchanged.
- Apply the same SQL to hosted Supabase through the Supabase MCP and verify policy removal with direct SQL.

## Storage Bucket Listing Hardening Edge Cases

- If any hidden client flow depended on listing bucket contents, it would now fail; repository search found no such flow.
- Existing image URLs should continue to work because delivery uses `/storage/v1/object/public/...` public object URLs.
- This does not resolve every anonymous-auth advisor warning; broader helper/RLS warnings need a separate function-by-function access review.

## Storage Bucket Listing Hardening Prompt

Sen Supabase Storage ve RLS guvenligi konusunda deneyimli bir backend guvenlik muhendisisin.
Hedef: Public media bucket'larda bucket listing yuzeyini kapat, fakat mevcut public image URL rendering ve authenticated upload/manage akislarini bozma.
Mimari: `storage.objects` uzerindeki broad public SELECT policy'lerini kaldiran idempotent SQL migration; yeni client fallback veya bucket listing davranisi eklenmez.
Kapsam: sadece Supabase storage policy migration, working docs ve validation. Mobile/web runtime UI, auth, Edge Functions ve pricing yok.
Cikti: SQL migration, hosted Supabase apply, policy/object URL smoke sonuc raporu.
Yasaklar: public URL erisimini kiracak private bucket donusumu yok, helper function grant'lerini korlemesine revoke etmek yok, `anon` auth'u kapatmak yok, unrelated code edit yok.
Standartlar: AGENTS.md, minimal diff, explicit validation, zero-trust storage metadata access.

## Storage Bucket Listing Hardening Validation Plan

- Hosted SQL check before and after migration for the targeted storage policies.
- Hosted public object URL smoke for representative existing media objects.
- `supabase db lint --local`
- `ADMIN_APP_BASE_URL=http://localhost:3021 npm --prefix apps/admin run smoke:routes`
- `ADMIN_APP_BASE_URL=http://localhost:3021 npm --prefix apps/admin run smoke:business-applications`
- `git --no-pager diff --check`

## Current Plan (Admin/Mobile Copy Tone Review)

- **Date:** 2026-05-06
- **Branch:** `feature/admin-mobile-copy-review`
- **Goal:** Clean up the remaining uncommitted admin/mobile/public Finnish copy changes so the product feels approachable without sounding unprofessional, while keeping behavior, auth, RLS, Edge Functions, and data contracts unchanged.

## Admin/Mobile Copy Architectural Decisions

- Treat this as a presentation-only copy/localization slice: no route, mutation, query, RPC, schema, or auth guard changes.
- Preserve the existing `DashboardLocale`, `PublicLocale`, and mobile `AppLanguage` structures instead of introducing new translation plumbing.
- Keep Finnish copy concise and friendly, but avoid slang that weakens trust in admin, organizer, scanner, security, fraud, or sign-out contexts.
- Keep public-site Finnish more energetic than the admin panel, but avoid words that make the business/customer flow feel unserious.
- Validate both touched apps because changed translation objects still participate in strict TypeScript shape checks.

## Admin/Mobile Copy Edge Cases

- CTA labels like announcement push, fraud confirmation, revoke/sign-out, and business application approval must remain clear and action-safe.
- Mobile short labels must still fit narrow bottom tabs and headers after copy cleanup.
- Public landing copy can be lively, but should still work for Finnish student organizations and business partners.
- Because the diff is mostly text, the security scan should be diff-scoped and verify no auth/RLS/payment/secret surfaces changed.

## Admin/Mobile Copy Prompt

Sen bir OmaLeima tuotteen FI/EN localization ja security-conscious UX copy reviewer olet.
Hedef: admin, organizer, public site ve mobile Finnish copy degisikliklerini samimi ama guvenilir production tonuna cek; argo, belirsiz veya riskli action copy'leri netlestir; davranis koduna dokunma.
Mimari: mevcut translation objectleri ve component-local copy map'leri korunacak. Yeni i18n sistemi, schema, RPC, Edge Function veya route degisikligi yok.
Kapsam: yalnizca mevcut dirty copy/localization dosyalari, calisma dokumanlari ve validation. Supabase migration, auth, scanner provisioning ve pricing yok.
Cikti: strict typed TS/TSX text updates, admin/mobile build validation, diff-scoped security note, handoff.
Yasaklar: unrelated degisiklikleri revert etmek yok, yeni fallback davranisi yok, action semantics'i belirsizlestirmek yok, `any` yok, gizli secret/log iceren copy yok.
Standartlar: AGENTS.md, minimal diff, clear actionable errors/actions, trusted Finnish tone, strict type validation.

## Admin/Mobile Copy Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
- Diff-scoped Codex Security review for touched files.

## Current Plan (Release Smoke Harness Stabilization)

- **Date:** 2026-05-06
- **Branch:** `bug/smoke-fixture-profile-upsert`
- **Goal:** Release-readiness turunda kirilan admin smoke fixture'larini product code'a dokunmadan tekrar guvenilir hale getirmek.

## Release Smoke Harness Stabilization Architectural Decisions

- Profile fixture SQL, `auth.users` trigger'i profile row'unu daha once olusturduysa `on conflict (id) do update` ile role/status/display_name'i smoke senaryosuna gore duzeltecek.
- Cookie-backed route smoke client'lari response `Set-Cookie` degerlerini kendi jar'ina geri yazacak. Boylece Next/Supabase session refresh sonrasi ayni smoke icindeki sonraki route request'leri stale cookie ile `AUTH_REQUIRED` almayacak.
- Static localized heading assertion'i yerine dinamik fixture title'lari kontrol edilecek; copy/localization degisiklikleri route data smoke'unu gereksiz yere kirmayacak.
- Product runtime code, Supabase schema ve Edge Functions bu slice'ta degismeyecek.

## Release Smoke Harness Stabilization Edge Cases

- Empty `Set-Cookie` value cookie removal olarak ele alinacak.
- `Headers.getSetCookie()` yoksa helper no-op kalacak; mevcut request cookie jar davranisi bozulmayacak.
- Existing seeded profile normalde yoksa `insert` path calisir; auth trigger row'u olusturduysa `update` path calisir.
- Local ports 3001/3002 baska servislerce kullaniliyorsa smoke'lar explicit `ADMIN_APP_BASE_URL` ile dogru Next server'a yonlendirilir.

## Release Smoke Harness Stabilization Prompt

Sen Next.js/Supabase route smoke harness ve guvenlik validasyonu konusunda deneyimli bir full-stack QA muhendisisin.
Hedef: Anonymous-auth/profile trigger hardening sonrasi kirilan admin/club smoke fixture'larini product code'a dokunmadan idempotent ve session-refresh-safe hale getir.
Mimari: SQL fixture `on conflict` upsert; script-local cookie jar response sync; brittle static copy assertion removal; existing smoke route contracts korunur.
Kapsam: sadece `apps/admin/scripts/smoke-*.ts` fixture/session harness ve working docs. Mobil runtime, Supabase migrations, Edge Functions ve mevcut unrelated copy degisikliklerine dokunma.
Cikti: strict typed TypeScript script degisiklikleri, admin typecheck/lint/build ve targeted smoke sonuclari.
Yasaklar: `any` yok, route auth'u bypass etme yok, product authorization koduna test icin fallback ekleme yok, unrelated dirty worktree revert/stage yok.
Standartlar: AGENTS.md, explicit failures, minimal diff, real local route-backed smoke.

## Release Smoke Harness Stabilization Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `supabase db lint --local`
- `npm --prefix apps/admin run smoke:rls-core`
- `ADMIN_APP_BASE_URL=http://localhost:3021 npm --prefix apps/admin run smoke:club-events`
- `ADMIN_APP_BASE_URL=http://localhost:3021 npm --prefix apps/admin run smoke:club-rewards`
- `ADMIN_APP_BASE_URL=http://localhost:3021 npm --prefix apps/admin run smoke:club-claims`
- `ADMIN_APP_BASE_URL=http://localhost:3021 npm --prefix apps/admin run smoke:club-department-tags`
- `ADMIN_APP_BASE_URL=http://localhost:3021 npm --prefix apps/admin run smoke:department-tags`
- `npm --prefix apps/admin run smoke:announcement-push`
- Mobile repo-level readiness audits and `git --no-pager diff --check`

## Current Plan (Scanner Revoke Session Cleanup)

- **Date:** 2026-05-06
- **Branch:** `bug/scanner-revoke-session-cleanup`
- **Goal:** Business owner kendi aktif scanner hesabini telefondan revoke edemesin; revoke edilen scanner cihazlar aninda cikis yapsin; scanner ekranindan manuel token QA alanini kaldir.

## Scanner Revoke Session Cleanup Architectural Decisions

- `business_scanner_devices` read modeline `scanner_user_id` eklenecek ve mobile summary `scannerUserId` tasiyacak. Business profile revoke butonu sadece aktif ve `scannerUserId !== currentUserId` olan cihazlarda gorunecek.
- Backend Edge Function `revoke-business-scanner-access` self-revoke durumunu device update'ten once `SELF_REVOKE_NOT_ALLOWED` ile reddedecek. UI gizlense bile API dogrudan cagrilirsa kendi session/device bozulmayacak.
- New Supabase migration `business_scanner_devices` tablosunu `supabase_realtime` publication'a idempotent ekleyecek.
- Scanner screen, device registration ready olduktan sonra kendi `scannerDeviceId` row'una realtime UPDATE subscription kuracak. Payload `status = REVOKED` oldugunda scanner state kilitlenecek, cache invalidation yapilacak ve `supabase.auth.signOut()` calisacak.
- Manual pasted token state, labels, handler, panel and styles removed from `business/scanner.tsx`; QR camera remains the only operational scan path.

## Scanner Revoke Session Cleanup Edge Cases

- Realtime payload gelmeden auth admin delete session'i dusururse mevcut auth state listener login'e gonderir; realtime path sadece daha hizli/temiz bir cikis saglar.
- Realtime delivery unavailable olursa scan RPC/device registration still fail-closed kalir; manual fallback eklenmez.
- Legacy devices with `scanner_user_id = null` can still be revoked by owner/manager because they are not provably the current user's scanner account.
- Repeated realtime revoke payloads sign-out idempotent davranmali; ref guard duplicate signOut cagrilarini engeller.

## Scanner Revoke Session Cleanup Prompt

Sen Supabase Realtime, Edge Function auth lifecycle ve Expo scanner UI konusunda deneyimli bir mobil/backend guvenlik muhendisisin.
Hedef: Business scanner cihaz revoke akisini self-revoke'e kapat, revoke edilen scanner session'lari realtime olarak logout et, ve scanner ekranindaki manuel token QA alanini production UI'dan kaldir.
Mimari: service-role Edge Function self-revoke guard; mobile scanner-device read model `scanner_user_id`; scanner screen row-level realtime subscription; Supabase realtime publication migration; minimal UI subtraction.
Kapsam: `apps/mobile/src/features/scanner/scanner-device.ts`, `apps/mobile/src/app/business/profile.tsx`, `apps/mobile/src/app/business/scanner.tsx`, `supabase/functions/revoke-business-scanner-access/index.ts`, new migration, working docs and validation/deploy. Public-site/content copy ve unrelated translation changes'e dokunma.
Cikti: strict typed TS/TSX/Deno TS/SQL degisiklikleri, explicit errors, local validation, hosted migration/function deploy.
Yasaklar: `any` yok, client-only security yok, scanner auth'u fake etme yok, scan history row'larini silme yok, unrelated dirty worktree revert/stage yok.
Standartlar: AGENTS.md, zero-trust backend, explicit session lifecycle, minimal diff.

## Scanner Revoke Session Cleanup Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `supabase db lint --local`
- `git --no-pager diff --check`
- Deploy `revoke-business-scanner-access`
- Apply hosted realtime publication migration
- Vercel deploy only if admin/web code changes are included; otherwise not needed for mobile/Supabase-only slice.

## Current Plan (Business Owner Onboarding Handoff)

- **Date:** 2026-05-06
- **Branch:** `feature/security-hardening-review`
- **Goal:** Admin business application approve sonrasi business owner hesabini ve membership'i panelden uretilebilir, tekrar tiklanabilir ve audit'lenebilir hale getirmek.

## Business Owner Onboarding Handoff Architectural Decisions

- New SQL RPC `create_business_owner_access_atomic` admin actor'u, business'i ve owner profile'i doğrular; profile'i `BUSINESS_OWNER/ACTIVE` yapar ve `business_staff OWNER/ACTIVE` membership'i idempotent olarak yazar.
- New Edge Function `admin-create-business-owner-access` platform admin bearer token'iyle calisir, approved application id'den business/contact context'ini bulur, auth user yoksa contact email ile olusturur, RPC'yi cagirir ve mümkünse Supabase recovery link uretir.
- Next.js admin route mevcut review transport pattern'ine benzer sekilde once admin access check yapar, sonra Edge Function'i invoke eder.
- Read-model approved applications icin linked business id ve owner membership durumunu getirir; UI reviewed cards uzerinde `Create owner access` aksiyonu ve scanner QR onboarding notu gosterir.
- Scanner worker account delivery bu slice'a eklenmez; owner login sonrasi mobile business profile QR ile staff cihaz provisioning akisi kullanilir.

## Business Owner Onboarding Handoff Edge Cases

- Application approved ama business row eksikse action `BUSINESS_NOT_FOUND` donmeli.
- Contact email ile profile zaten varsa yeni auth user yaratmadan mevcut user owner membership'e baglanmali.
- Auth create basarili ama RPC fail olursa hata acik detayla donmeli; sessiz partial success yok.
- Recovery link generate edilemezse owner access yine create edilebilir, ama UI bunu onboarding link unavailable olarak gostermeli.

## Business Owner Onboarding Handoff Prompt

Sen Supabase Auth Admin, PostgreSQL RPC ve Next.js admin panel konusunda deneyimli bir full-stack guvenlik muhendisisin.
Hedef: Approved business application sonrasinda admin panelden owner auth/profile/membership access'i olusturan ve scanner QR onboarding'i baslatmaya yeterli handoff bilgisini gosteren production-ready vertical slice uret.
Mimari: Next.js admin route -> Supabase Edge Function -> service-role Supabase Auth Admin + atomic PostgreSQL RPC. Read-model business/application/link durumunu server-side okur, UI idempotent aksiyon gosterir.
Kapsam: business applications admin read-model/types/components/routes, Supabase migration, Edge Function, working docs ve validation. Pricing, public website, student mobile ve unrelated admin sayfalarina dokunma.
Cikti: strict typed TS/TSX/SQL/Deno TS degisiklikleri, explicit error statuses, owner membership idempotency, validation komutlari.
Yasaklar: `any` yok, plaintext password UI'da gostermek yok, client-side role mutation yok, scanner worker password modeli eklemek yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, zero-trust backend, service-role only privileged writes, audit log, minimal diff.

## Business Owner Onboarding Handoff Validation Plan

- `supabase db lint --local`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- Hosted deploy/apply after local validation if production smoke is needed

## Current Plan (Scanner Provisioning Duplicate Scan + Device Cleanup)

- **Date:** 2026-05-06
- **Branch:** `bug/scanner-provisioning-device-cleanup`
- **Goal:** Business owner QR scanner provisioning tek okutmayla tek transaction calistirsin; silinen scanner cihazlari business profil listesinde gorunmesin; Edge Function hatalari generic degil actionable olsun.

## Scanner Provisioning Duplicate Scan + Device Cleanup Architectural Decisions

- `BusinessQrSignIn` icinde React state'e ek olarak `useRef` tabanli synchronous lock kullanilacak. QR callback ilk girdiginde lock set edilir ve kamera kapatilir; boylece ayni frame/dalga icinde ikinci callback anonymous sign-in baslatamaz.
- Basarisiz provisioning'de lock serbest birakilir, fakat scanner kapali kalir; kullanici bilincli olarak tekrar `Scan owner QR` basarak yeni deneme baslatir. Basarili provisioning'de lock route degisimi tamamlanana kadar serbest birakilmaz.
- Mobile Supabase Functions helper'i `FunctionsHttpError`/`FunctionsRelayError` response body clone'unu okuyup `status`, `message`, `details.provisionStatus` gibi alanlari anlamli hata mesajina cevirir.
- Business scanner devices query sadece `status = ACTIVE` kayitlari dondurur. Revoke islemi DB'de audit/history icin row'u `REVOKED` tutmaya devam eder; UI listesi aktif cihaz envanteri olur.
- `provision-business-scanner-session` Edge Function RPC non-success status'unu error response status alaninda aynen korur.

## Scanner Provisioning Duplicate Scan + Device Cleanup Edge Cases

- Ayni QR callback storm'u gelirse sadece ilk callback islem baslatir; sonrakiler lock yuzunden no-op olur.
- QR token zaten kullanilmissa mobil hata `QR_ALREADY_USED`/`QR_EXPIRED` gibi durumlari gosterebilir; generic non-2xx olmaz.
- Anonymous sign-in rate limit artik callback storm yuzunden tetiklenmemeli. Gercek manuel tekrar denemelerde Supabase rate limit yine olabilir; bu durumda Supabase'in kendi auth hatasi gosterilir.
- Revoke sonrasi cihaz row'u DB'de kalir ama aktif listeye donmez; scan history ve audit korunur.

## Scanner Provisioning Duplicate Scan + Device Cleanup Prompt

Sen Expo Camera, Supabase Auth ve Supabase Edge Functions konusunda deneyimli bir mobil/backend guvenilirlik muhendisisin.
Hedef: Owner QR scanner provisioning flow'unda ayni QR'in kamera callback storm'u ile birden fazla anonymous sign-in/provision istegi baslatmasini engelle; revoked scanner cihazlari business profil listesinde gizle; Edge Function non-2xx hata nedenlerini mobilde net goster.
Mimari: mobile `BusinessQrSignIn` icinde ref lock + camera close; shared mobile function error parser; `business_scanner_devices` query active-only; Edge Function status preservation. Existing RPC ve DB history modeli korunur.
Kapsam: mobile scanner login/device helper/profile, `provision-business-scanner-session` Edge Function, working docs, validation ve deploy. Unrelated dashboard shell degisikligine dokunma.
Cikti: strict typed TS/TSX/Deno TS degisiklikleri, Supabase function deploy, mobile/admin validation ve Vercel deploy.
Yasaklar: `any` yok, sessiz fallback yok, scanner session'i client'ta fake etme yok, revoked DB row'larini silip history bozmak yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, explicit errors, minimal diff, zero-trust backend, physical smoke-ready behavior.

## Scanner Provisioning Duplicate Scan + Device Cleanup Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `supabase db lint --local`
- Deploy `provision-business-scanner-session`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- Vercel production deploy after merge

## Current Plan (Release Smoke Readiness)

- **Date:** 2026-05-06
- **Branch:** `feature/release-smoke-readiness`
- **Goal:** Re-establish a trustworthy release smoke baseline after production deploy without reintroducing removed testing UI, and close the highest-confidence Supabase advisor issue that can be fixed safely in this slice.

## Release Smoke Readiness Design

- Use Supabase MCP for hosted project/migration state and local npm audits for mobile readiness.
- Treat the business scanner as camera-based and QR-only; do not add manual token controls back to production UI.
- Align `audit:hosted-business-scan-readiness` and docs to the real physical-device scanner path.
- Add a Supabase migration that revokes `PUBLIC`/`anon` execute from privileged SECURITY DEFINER mutation/trigger functions while preserving `authenticated`/`service_role` execute.
- Run mobile typecheck/lint plus the relevant readiness audits after the audit harness change.

## Prompt

Sen Expo React Native ve release-smoke guvenilirligi konusunda deneyimli bir mobil QA muhendisisin.
Hedef: Son deploy sonrasi mobile release smoke auditlerini dogru urun karariyla hizala; business scanner operasyon UI'i QR-only kalsin; Supabase anon RPC execute yuzeyini daralt.
Mimari: Mevcut scanner ekranina dokunmadan audit script ve test dokumanlarini camera-based scanner smoke path'e guncelle; DB tarafinda privilege-only migration kullan.
Kapsam: `apps/mobile/scripts/audit-hosted-business-scan-readiness.mjs`, mobile README, testing docs, Supabase privilege migration ve working docs. Yeni scanner ozelligi veya manual token UI yok.
Cikti: Strict JS/doc/SQL degisikligi, hosted Supabase migration, npm audit/typecheck/lint validasyonu ve cihaz/simulator hazirlik raporu.
Yasaklar: Manual token scan UI geri eklemek yok, Supabase state'i tahmin etmek yok, helper/RLS public read behavior'ini genis refactor ile bozmak yok, unrelated code revert yok, fallback davranisi uydurmak yok.
Standartlar: AGENTS.md, minimal diff, mevcut test stratejisi, acik blocker raporu.

## Release Smoke Readiness Validation Plan

- `npm --prefix apps/mobile run audit:hosted-business-scan-readiness`
- `npm --prefix apps/mobile run audit:realtime-readiness`
- `npm --prefix apps/mobile run audit:native-push-device-readiness`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `supabase db lint --local`
- Hosted ACL query for representative mutation RPCs
- `npm --prefix apps/admin run smoke:rls-core`
- `git --no-pager diff --check`

## Current Plan (Scanner QR Login Redirect Regression)

- **Date:** 2026-05-06
- **Branch:** `feature/security-hardening-review`
- **Goal:** Owner QR okutulduktan sonra scanner session provisioning basariliysa kullaniciyi stale `SUSPENDED` access cache'i yuzunden tekrar login/auth yuzeyine dusurmemek.

## Scanner QR Login Redirect Regression Architectural Decisions

- QR login flow anonymous auth'u bir son durum degil, provisioning transaction baslangici olarak ele alacak.
- `signInAnonymously()` sonucu user id zorunlu olarak okunacak; user id yoksa acik hata verilecek.
- Provisioning Edge Function basarili dondugunde `sessionAccessQueryKey(userId)` invalidate/refetch edilecek ve `fetchSessionAccessAsync(userId)` ile backend'deki son profil/membership state dogrulanacak.
- Navigation sadece access `area = business`, `homeHref = /business/scanner`, ve `isBusinessScannerOnly = true` oldugunda yapilacak. Aksi durumda session sign-out ile fail-closed davranis korunacak.
- Announcement popup ve push-router bridge'leri provisioning transaction'i sirasinda ve scanner-only access icin devre disi kalacak; duyuru UI'i rol/access cozulmeden anonymous login yuzeyine bind olmayacak.
- Existing email/password business login ve student Google login akislarina dokunulmayacak.

## Scanner QR Login Redirect Regression Edge Cases

- QR token gecersiz/expired ise mevcut catch + signOut davranisi korunur.
- Provisioning basarili ama session access hala scanner degilse kullanici login'e sessizce donmek yerine actionable error gormeli.
- Query cache temizleme navigation'dan once yapilmali; aksi halde business layout stale unsupported state ile render edebilir.
- Parent auth layout kisa sureli suspended anonymous state'i gorebilir; ancak flow sonunda cache refetch ve explicit navigation scanner state'i stabilize eder.
- Popup duyurular access cozulmeden acilirsa provisioning overlay'in uzerinde modal gosterebilir; bu nedenle popup query enable kosulu session degil, cozulmus non-scanner access olmali.

## Scanner QR Login Redirect Regression Prompt

Sen Expo Router, Supabase Auth ve React Query session guard konusunda deneyimli bir mobil auth muhendisisin.
Hedef: Business owner QR scanner login akisi anonymous auth hardening sonrasi stale session-access cache yuzunden tekrar login'e dusmesin; provisioning sonrasi access'i refetch edip dogrulayarak scanner ekranina stabilize et.
Mimari: mevcut `BusinessQrSignIn`, `fetchSessionAccessAsync`, `sessionAccessQueryKey`, Supabase anonymous auth ve provisioning Edge Function kontrati korunur; sadece mobile QR login transaction sequencing duzeltilir.
Kapsam: mobile auth QR sign-in component, working docs ve targeted mobile validation. Supabase SQL, Edge Functions, public web ve unrelated UI dosyalarina dokunma.
Cikti: strict typed TSX degisikligi, acik hata mesajlari, cache invalidation/refetch ve validation komutlari.
Yasaklar: `any` yok, sessiz fallback yok, scanner provisioning basarisizken role'i client'ta fake etme yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, fail-closed auth, explicit errors, minimal diff.

## Scanner QR Login Redirect Regression Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
- Physical iPhone/Android QR provisioning smoke after build refresh

## Current Plan (Anonymous Auth Security Hardening)

- **Date:** 2026-05-06
- **Branch:** `feature/security-hardening-review`
- **Goal:** Anonymous Supabase Auth acikken scanner provisioning calissin, fakat anonymous session'lar active student/admin/business veya public-intake bypass kapisi haline gelmesin.

## Anonymous Auth Security Hardening Architectural Decisions

- Auth trigger anonymous/email-less users icin placeholder email uretmeye devam edecek, ancak profile `status = SUSPENDED` olarak acilacak. Normal email'li auth users mevcut `ACTIVE/STUDENT` davranisini korur.
- Scanner owner-QR provisioning zaten service-role Edge Function + atomic RPC uzerinden profile'i `BUSINESS_STAFF/ACTIVE` seviyesine cekiyor. Bu nedenle suspended-by-default anonymous model scanner onboarding'i bozmaz; sadece provisioning oncesi yetkisiz app akislarini kapatir.
- `profiles` own-row update policy korunabilir, fakat hassas alanlar icin database trigger fail-closed calisacak. `primary_role`, `status`, `email`, ve `created_at` gibi alanlar sadece `service_role` veya migration/postgres context'inde degisebilir.
- Public business applications icin direct DB insert policy kaldirilacak. Basvuru kabul yolu sadece server route + service-role + Turnstile dogrulamasi olacak.
- Support request insert policy aktif profil kontroluyle daraltilacak. Active business/club membership kontrolleri mevcut helper'larla korunacak.
- `register-device-token` Edge Function profile durumunu kontrol edecek ve suspended/deleted kullanicilar icin `PROFILE_NOT_ACTIVE` donecek.

## Anonymous Auth Security Hardening Edge Cases

- Daha once anonymous smoke ile olusan active placeholder profile'lar varsa, aktif business scanner membership'i olmayanlar `SUSPENDED` durumuna alinmali.
- Provisioned scanner user'lar yanlışlikla suspended edilmemeli; `business_staff.status = ACTIVE` membership'i olan placeholder scanner hesaplari migration update filtresinden haric tutulur.
- Profile trigger service-role revocation/provisioning RPC'lerini engellememeli. Trigger sadece caller role `authenticated` gibi client context'lerinde hassas field degisimini engeller.
- Business application form server route'u service-role ile yazdigi icin insert policy kaldirilmasindan etkilenmez; client-side direct insert yolu ise beklenen sekilde RLS ile kapanir.

## Anonymous Auth Security Hardening Prompt

Sen Supabase Auth/RLS ve Edge Function guvenlik review uzmansin.
Hedef: Anonymous sign-in acikken OmaLeima'da anonymous session'larin active student, profile self-promotion, business application Turnstile bypass veya push/support spam kapisi olmasini engelleyen kucuk ama kokten guvenlik sertlestirmesini uret.
Mimari: SQL migration ile auth trigger/RLS/trigger policy hardening; Edge Function'da active profile gate; hosted Supabase MCP/CLI ile migration deploy ve gercek anonymous smoke validation.
Kapsam: Supabase migrations, `register-device-token` Edge Function, working docs, hosted validation ve proje-geneli gap raporu. Public website tasarimi, mobile UI polish ve unrelated dirty worktree dosyalarina dokunma.
Cikti: strict SQL + TypeScript degisiklikleri, fail-closed error kodlari, hosted migration deploy notu, validation sonuclari ve kalan proje eksiklerini onceliklendiren kisa rapor.
Yasaklar: `any` yok, sessiz fallback yok, RLS bypass eden client hack yok, unrelated degisiklik revert yok, anonymous sign-in'i tamamen kapatarak scanner provisioning'i bozmak yok.
Standartlar: AGENTS.md, Codex Security scan phases, zero-trust Supabase RLS, explicit actionable errors, minimal diff, real hosted smoke where practical.

## Anonymous Auth Security Hardening Validation Plan

- Supabase MCP ile hosted project/migration state kontrolu
- `supabase db lint --local` veya SQL parse smoke
- Hosted migration apply via Supabase MCP
- `supabase functions deploy register-device-token --project-ref jwhdlcnfhrwdxptmoret`
- Real anonymous smoke: profile suspended-by-default, profile self-promotion blocked, direct business application insert blocked
- Edge Function smoke: suspended anonymous token cannot register push token
- `git --no-pager diff --check`

## Current Plan (Owner QR Scanner Provisioning)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Business owner/manager QR'i ile staff cihazini sifre paylasmadan scanner hesabina cevirmek ve cihaz silindiginde scanner erisimini kapatmak.

## Owner QR Scanner Provisioning Architectural Decisions

- Owner QR, client tarafinda uretilecek statik bir secret olmayacak. Business owner/manager authenticated session ile Supabase Edge Function'a gidecek; function business manager yetkisini kontrol edip kisa omurlu, imzali, tek kullanimlik QR token dondurecek.
- Scanner login, email/password yerine Supabase anonymous session ile baslayacak. QR scan sonrasi cihaz kendi access token'i ile provisioning Edge Function'a gidecek.
- Provisioning tek DB RPC icinde atomik olacak: QR grant `for update` ile consume edilecek, anonymous profile `BUSINESS_STAFF` rolune cekilecek, `business_staff(role = SCANNER)` kaydi acilacak ve `business_scanner_devices.scanner_user_id` ile cihaz o scanner user'a baglanacak.
- Revocation manager-only service-role Edge Function uzerinden yapilacak. Device `REVOKED`, staff membership `DISABLED`, profile `DELETED` olacak; FK'ler izin verdiginde auth user silinecek ve scan history business/event uzerinden korunacak.
- Mobile UI iki yuzeyde kalacak: business profile'da owner/manager icin rotating QR karti, login business modunda compact `QR okut` scanner girisi. Mevcut email/password login korunacak.

## Owner QR Scanner Provisioning Edge Cases

- Expired QR kullanimi `QR_EXPIRED`, tekrar kullanilan QR `QR_ALREADY_USED`, manager yetkisi olmayan QR uretimi `ACTOR_NOT_ALLOWED` olarak fail-closed donmeli.
- Ayni cihaz daha once revoke edildiyse ancak owner yeni QR gosteriyorsa, provisioning yeni owner onayi kabul edilerek cihaz tekrar aktif scanner user'a baglanabilir.
- Anonymous auth hosted projede kapaliysa mobile UI net hata vermeli; production'a gecmeden Supabase Auth anonymous sign-in ayari da aktiflenmelidir.
- Scanner user silinse bile `stamps`, `qr_token_uses`, `fraud_signals`, `audit_logs` gibi tarihsel kayitlar silinmemeli veya FK hatasi uretmemeli.

## Owner QR Scanner Provisioning Prompt

Sen Supabase Auth/RLS ve Expo mobile provisioning konusunda deneyimli bir full-stack guvenlik muhendisisin.
Hedef: Business owner QR ile scanner cihazini sifre paylasmadan provision eden, revocation ile scanner erisimini kapatan, scan history'yi koruyan calisir bir vertical slice uret.
Mimari: Edge Function -> service-role Supabase client -> atomic PostgreSQL RPC; mobile tarafta mevcut session/provider/router ve scanner-device helper'larini reuse et.
Kapsam: sadece owner-QR scanner provisioning lifecycle, business profile QR display, business login QR scan ve ilgili DB/Edge Function dosyalari. Pricing, public website ve unrelated admin sayfalarina dokunma.
Cikti: TypeScript Edge Functions, SQL migration, Expo React Native TypeScript component/helper degisiklikleri, ilgili working docs guncellemeleri.
Yasaklar: `any` yok, sessiz fallback yok, fake session yok, RLS bypass eden client-side hack yok, unrelated dirty worktree revert yok, uzun vadeli scan history'yi bozan cascade delete yok.
Standartlar: AGENTS.md, Supabase security best practices, short-lived signed QR, one-time grant consumption, strict typed responses, explicit actionable errors, validation commands after edits.

## Owner QR Scanner Provisioning Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Supabase local migration parse/apply smoke if the local stack is reachable
- `git --no-pager diff --check`
- Hosted apply/deploy only after local validation, using Supabase MCP `_apply_migration` and `_deploy_edge_function`

## Current Plan (Public Website Simplification Redesign)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Web sitesini kalabalik section yigini olmaktan cikarip referanstaki gibi daha poster-benzeri, daha temiz ve daha az copy ile daha guclu bir kamuya acik sunuma cevir.

## Public Website Simplification Redesign Architectural Decisions

- `frontend-design` ve `frontend-skill` yonu bu slice'ta "editorial poster minimalism" olacak: tek guclu hero, kisa akis, bir ana destek bolumu ve tek net CTA. Section sayisi azaltilacak.
- Public landing artik pricing veya checkout merkezli olmayacak. Stripe/public checkout UI homepage akisi disina alinacak; ana public aksiyonlar `contact` ve `apply` olacak.
- Hero gorseli icin `imagegen` ile uretilen yeni editorial photo kullanilacak; diger destek bloklarinda mevcut repo asset'leri yeniden secilerek gereksiz gorsel kalabalik azaltilacak.
- Navbar/footer korunacak ama nav item yapisi sadeleştirilecek; public pages ayni shell ve spacing sistemiyle hizalanacak.
- Contact/apply/legal sayfalari yeni visual language ile ayni ailede hissedilecek: daha az utility clutter, daha guclu heading ritmi, daha sakin shell treatment.
- Content modeli sadeleştirilecek: stale `#pricing` ve `#model` anchor'lari kaldirilacak, public landing copy apply/contact akisi etrafinda yeniden adlandirilacak.
- Public Stripe code'u project codepath'inden cikacak; website checkout route/button/package dosyalari kaldirilacak ve admin package dependency temizlenecek.

## Public Website Simplification Redesign Edge Cases

- Landing'den pricing section kalkinca `#pricing` anchor'lari ve checkout status akisi stale kalabilir; homepage page entry ve nav item'lari buna gore sadeleştirilmeli.
- Content tiplerinde pricing/growth alanlari kalsa bile render'dan ciktiği surece lint/typecheck kirilmamali; bu slice once UX'i duzeltir, derin type cleanup gerekmiyorsa sonraya birakilir.
- Yeni generated hero dosyasi repo icine kopyalanmali; sadece `~/.codex/generated_images` altinda kalmamali.
- Contact/apply/legal sayfalarinda yeni sistem uygulanirken mevcut Turnstile/form logic'e dokunulmamalidir; sadece layout ve copy hiyerarsisi sadeleşmeli.

## Public Website Simplification Redesign Prompt

Sen bir Next.js public-site tasarim ve art-direction uzmansin.
Hedef: OmaLeima'nin public websitesini kullanicinin paylastigi referansa yakin sekilde daha temiz, daha koyu, daha premium ve daha az kalabalik bir tasarima gecir; pricing alanini tamamen disarida birak ve public CTA'lari contact/apply eksenine indir.
Mimari: mevcut App Router public pages, `PublicNavbar`, `PublicFooter`, content-based locale sistemi ve global public CSS korunur; landing-page + content/nav + paylasilan public page shell'leri minimal fakat etkili bir sekilde yeniden kompoze edilir.
Kapsam: public landing, public content/nav copy, homepage metadata hero image refs, contact/apply/legal page layout styling, working docs, validation ve gerekirse lokal visual smoke. Yeni hero gorseli icin built-in `image_gen` kullan.
Cikti: strict typed TS/TSX/CSS degisiklikleri, repo icinde yeni hero image asset'i, daha sade public section yapisi ve temiz admin build/lint/typecheck.
Yasaklar: `any` yok, theme disina cikan parlak renkler yok, gereksiz section cogaltmak yok, existing form/security logic'e dokunmak yok, pricing checkout'u homepage'e geri sokmak yok.
Standartlar: AGENTS.md, restraint-first composition, production-grade responsive layout, clean hierarchy over component count.

## Public Website Simplification Redesign Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- optional local visual smoke if environment allows

## Current Plan (Cross-Role Mobile Design Audit Round Two)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Kalan yogun mobile surfaces'i daha sakin, daha hizli okunur ve daha operasyonel bir duzene cekmek; ozellikle profile, leaderboard, scanner ve upcoming ekranlarinda gereksiz baslik/copy/kart katmanlarini azaltmak.

## Cross-Role Mobile Design Audit Round Two Architectural Decisions

- `frontend-design` ve `frontend-skill` bu turda yine kullanilacak; gorsel tez "calm operational minimalism" olarak korunacak, ancak ilk turdan farkli olarak odak copy silmekten cok hiyerarsiyi sikistirmak olacak.
- Shared primitives (`InfoCard`, `CoverImageSurface`, `StatusBadge`, modal/preferences patterns) korunacak. Bu slice component sistemi degistirmeyecek; screen-level composition ve metin azaltma yapacak.
- Feed-first veya action-first screens'te aciklayici alt metin sadece gercekten karar verdirmeye yardim ediyorsa kalacak. Aksi halde title + state yeterli sayilacak.
- Operational fallback tools, ozellikle business scanner manuel token yuzeyi, ana akisla ayni gorsel agirlikta tutulmayacak; daha ikincil ve daha test-yardimci bir presentation'a cekilecek.
- Profile surfaces'te amac "card icinde bir kart" hissini azaltmak olacak. Ayrica gereksiz ara basliklar ya da tekrar eden preference frameleri duzlestirilecek.

## Cross-Role Mobile Design Audit Round Two Edge Cases

- Scanner ekraninda manual token yuzeyi cok gizlenirse test akisi zorlasabilir; bu nedenle tamamen kaldirilmayacak, sadece daha ikincil sunulacak.
- Leaderboard ekraninda fazla metin azaltirken error/loading/empty state'lerin hala anlasilir kalmasi gerekir; sadece basarili durumda yer kaplayan tekrarlar kesilmeli.
- Profile ekranlarinda header/copy azaltimi support, language, theme, push setup veya media upload capability'lerini gorunmez hale getirmemeli.
- Club upcoming filtreleri duzlestirilirken yatay chip rail davranisi bozulmamali; sadece wrapper ve subtitle yogunlugu azaltilmali.

## Cross-Role Mobile Design Audit Round Two Prompt

Sen bir Expo React Native mobil urun tasarimi ve UI polish uzmansin.
Hedef: OmaLeima'nin student, organizer ve business mobil ekranlarinda ilk sadeleştirme turundan sonra yogun kalan profile, leaderboard, updates, scanner ve upcoming surfaces'i profesyonel bir tasarimci gozuyle tekrar incele; gereksiz frame, tekrar eden copy, zayif hiyerarsi ve ikincil araclari baskin gosteren yuzeyleri sakinlestir.
Mimari: mevcut Expo Router screen yapisi, theme tokenlari, shared UI primitives ve role bazli akislar korunur; minimal screen-level TSX/stil degisiklikleriyle ilerlenir.
Kapsam: `student/updates`, `student/leaderboard`, `student/profile`, `business/scanner`, `business/profile`, `club/upcoming`, `club/profile`, ilgili working docs ve validation.
Cikti: strict typed TS/TSX degisiklikleri, azaltılmış copy/chrome, daha net operasyonel hiyerarsi ve temiz mobile validation.
Yasaklar: `any` yok, yeni dependency yok, theme disi parlak renk yok, unrelated logic refactor yok, test yardimci yuzeyleri tamamen silmek yok.
Standartlar: AGENTS.md, restraint-first mobile design, utility over narration, production-grade readability.

## Cross-Role Mobile Design Audit Round Two Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
- TypeScript reviewer pass on touched TS/TSX files

## Current Plan (Cross-Role Mobile Design Audit)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Student, organizer, and business mobile surfaces'i ayni theme icinde daha sakin, daha amac-odakli ve daha premium hissettirecek sekilde sadeleştir.

## Cross-Role Mobile Design Audit Architectural Decisions

- `frontend-design` ve `frontend-skill` yonu bu slice'ta "calm operational minimalism" olacak: guclu tipografi + net hiyerarsi korunur, ama role disi aciklama ve ornamental chrome kaldirilir.
- Bu tur "eklemekten cok cikarmak" yaklasimi kullanilacak. Kullanicinin isiyle ilgisiz growth/pilot/sponsor copy'leri mobile operational surfaces'ten temizlenecek.
- Student rail'lerinde hareketi aciklayan `Auto` gibi copy'ler kaldirilacak; motion varligini UI'nin kendisi hissettirecek, metin anlatmayacak.
- Shared theme ve component primitives korunacak; buyuk bir component rewrite yerine screen-level minimal diffs tercih edilecek.
- Organik sonraki adim icin daha genis bir mobil audit backlog'u cikabilir, ancak bu slice ilk olarak en yuksek etkili ve en dusuk riskli clutter alanlarini kapatacak.

## Cross-Role Mobile Design Audit Edge Cases

- Growth kartlari kaldirilinca business ve club home ekranlari bosalmis hissedebilir; bu nedenle kalan scanner/events/summaries bloklarinin ritmi korunmali.
- Student rail meta azaltildiginda carousel tamamen anlamsizlasmamali; event count gibi faydali meta korunabilir ama mekanik aciklama copy'si cikmali.
- Translation copy object'lerinde artan ama kullanilmayan label alanlari gecici olarak kalabilir; bu slice UI sadeleştirmeyi oncelikli tutar ve genis cull/refactor yapmaz.

## Cross-Role Mobile Design Audit Prompt

Sen bir mobil urun tasarimcisi ve Expo React Native uygulama polish uzmansin.
Hedef: OmaLeima'nin student, organizer ve business mobil ekranlarinda kullanicinin isine hizmet etmeyen tekrarli, gereksiz veya mantiksiz UI/copy bloklarini kaldir; mevcut lime/dark tema icinde daha sakin ve daha premium bir hiyerarsi kur.
Mimari: mevcut mobile theme tokenlari, screen yapilari ve shared components korunur; minimal screen-level TSX degisiklikleriyle ilerlenir.
Kapsam: business home, club home, student events, student rewards ve bu ekranlara bagli working docs/validation. Gerekliyse paylasilan kucuk UI metinleri sadeleştirilebilir.
Cikti: strict typed TS/TSX degisiklikleri, azaltılmış clutter, daha net role-specific surfaces ve temiz validation.
Yasaklar: `any` yok, theme disina cikmak yok, parlak yeni renk yok, unrelated logic degisikligi yok, yeni dependency yok.
Standartlar: AGENTS.md, mevcut tasarim dili, high-signal subtraction, production-grade mobile UI restraint.

## Cross-Role Mobile Design Audit Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Organizer Announcement Edit Focus + Login Language Menu)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Club duyuru duzenleme akisini aninda gorunur hale getir ve login dil secicisini daha kompakt, daha temiz bir utility menuye donustur.

## Organizer Announcement Edit Focus + Login Language Menu Architectural Decisions

- `frontend-design` ve `frontend-skill` yonu bu slice'ta "calm operational minimalism" olacak: birincil akisa hizmet etmeyen sabit buton kalabaligi azaltilir, kontrol sayisi degil okunurluk oncelenir.
- Root `AppScreen` mevcut `ScrollView` yapisini koruyacak; sadece opsiyonel bir `scrollViewRef` expose edilerek ihtiyac duyan ekranlara kontrollu scroll imkani verilecek.
- Club announcements ekraninda satira tiklandiginda once draft edit verisi set edilir, sonra root scroll `y=0` konumuna animasyonlu sekilde cekilir. Ayrica ust form copy'si mevcut draft durumunu daha acik gosterecek.
- Login dil secici yeni state makinesi yazmayacak; mevcut `useUiPreferences().language` ve `setLanguage()` korunacak. UI ise globe ikonu + locale etiketi + acilan kucuk dropdown olacak.
- Dropdown modal yerine ayni kart icinde absolute/floating menu olarak cozulur; bu, akisi daha hafif tutar ve login ekranini gereksiz sheet/modal hissinden kurtarir.

## Organizer Announcement Edit Focus + Login Language Menu Edge Cases

- Club screen'de row tap save/archive pending iken edit'e gecmemeli; mevcut pending guard korunmali.
- Auto-scroll tetigi ayni announcement'a tekrar basildiginda da calismali; sadece `draft.announcementId` degisikligine bagli olmak yeterli olmayabilir.
- Login dropdown'u acikken mod degisimi veya successful auth redirect olursa acik menu stale kalmamali; state basit toggle ile kapanabilmeli.
- Outside tap icin agir global dismiss mekanizmasi eklenmeyecek; tekrar ikon tiklamasi veya dil secimi menu'yu kapatmak icin yeterli.

## Organizer Announcement Edit Focus + Login Language Menu Prompt

Sen bir Expo React Native urun-tasarim ve operasyonel mobil UX uzmanisin.
Hedef: Organizer mobile duyuru ekraninda bir duyuruya dokunuldugunda duzenleme modunun ust formda hemen goruldugu bir akis kur ve login ekranindaki kaba FI/EN butonlarini globe ikonlu kompakt bir dropdown seciciyle degistir.
Mimari: mevcut `AppScreen` root scroll yapisi, `club/announcements` form/feed kompozisyonu, `useUiPreferences()` dil durumu ve mevcut theme tokenlari korunur; yeni dependency eklenmez.
Kapsam: mobile `AppScreen`, `club/announcements`, `auth/login`, calisma dokumanlari ve targeted validation.
Cikti: strict typed TS/TSX degisiklikleri, net edit affordance, daha sakin login utility menu ve temiz lint/typecheck.
Yasaklar: `any` yok, unrelated screen refactor yok, yeni global modal system yok, theme disi parlak renk yok, sessiz fallback yok.
Standartlar: AGENTS.md, mevcut design language, minimal diff, high-signal UX polish.

## Organizer Announcement Edit Focus + Login Language Menu Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Announcement Push Reliability + Dashboard Locale Cohesion)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Duyuru push aksiyonlarini anlasilir ve guvenilir hale getir, admin/organizer locale akisindaki karisikliklari azalt, department-tag merge primary conflict'ini kapat ve mobil bildirim tiklamasini duyuru detayina bagla.

## Announcement Push Reliability + Dashboard Locale Cohesion Architectural Decisions

- Web announcement push transport'u Supabase Functions invoke hatalarinda `Response` body/status bilgisini okuyacak; panel generic SDK string'i degil function'in kendi `message` ve `status` alanlarini gosterecek.
- `AnnouncementRecord` read-model'i mevcut `notifications` tablosundan announcement-bazli delivery ozetini okuyacak. Panel `Send push` butonunu yalnizca `PUBLISHED + active time window + no prior successful delivery` oldugunda aktif birakacak.
- Dashboard locale cookie modeli korunacak; ancak locale'i kullanan sayfalar explicit hale getirilecek ve announcements/department-tags panelleri kendi locale-aware copy sozlukleriyle calisacak.
- Department-tag merge bug'i eski migration dosyasini yeniden yazarak degil, yeni bir corrective migration ile cozulur. Trigger `sync_department_tag_profile_links()` source primary profile id'lerini once toplar, source primary'leri demote eder, sonra target primary promotion'i yapar.
- Mobile push click-through icin yeni router bridge `expo-notifications` response listener'i kullanir. Payload `type === "ANNOUNCEMENT"` ise mevcut session access alanina gore `/student/announcement-detail`, `/business/announcement-detail`, veya `/club/announcement-detail` route'una gider.
- Announcement detail veri modeli buyuk schema degisikligi istemez; mevcut `clubName` + `sourceType` ile explicit sender label olusturulur. Platform kaynagi `OmaLeima Support` olarak gosterilir.

## Announcement Push Reliability + Dashboard Locale Cohesion Edge Cases

- Daha once hic gonderilmemis ama tum hedefleri push preference kapatmis bir announcement yine function tarafinda `NOTIFICATION_RECIPIENTS_NOT_FOUND` donebilir; UI bunu generic fail olarak gizlememeli.
- `notifications` tablosunda eski `FAILED` kayitlar varsa announcement push tekrar denenebilmelidir; yalnizca basarili teslimat varliginda buton disabled olmalidir.
- Expo `getLastNotificationResponse()` cold start'ta ayni response'u tekrar verebilir; mobile bridge son islenen announcement key'ini ref ile tutup cift navigation'i engellemelidir.
- Dashboard locale panel copy'leri çevrilse bile diger daha az kullanilan panellerde kalan English metinler olabilir; bu slice once karisik locale hissini yaratan ana yuzeyleri toparlar.

## Announcement Push Reliability + Dashboard Locale Cohesion Prompt

Sen bir Supabase Edge Function transport, Next.js dashboard i18n ve Expo notification routing uzmanisin.
Hedef: OmaLeima'da announcement push hatalarini web UI'da gercek nedenleriyle goster, artik gonderilemeyecek duyurular icin butonu fail-late yerine fail-early hale getir, admin/organizer dashboard locale gecisini announcements ve department-tags yuzeylerinde tutarli calistir, department-tag merge primary conflict trigger'ini duzelt ve mobilde push'e tiklayinca kullaniciyi dogru duyuru detayina gotur.
Mimari: mevcut Supabase Edge Function kontrati, `notifications` tablosu, dashboard locale cookie route'u, mevcut mobile announcement detail route'lari ve session access query korunur; minimal typed katman genislemeleriyle ilerlenir.
Kapsam: admin announcements transport/read-model/panel/page dosyalari, dashboard locale'li admin/club page wiring, department-tags panel/components/trigger migration, mobile announcement detail + yeni push response bridge, calisma dokumanlari, validation ve gerekiyorsa deploy.
Cikti: strict typed TS/TSX/SQL degisiklikleri, anlamli push action feedback, locale-aware panel copy, yeni migration ve temiz mobile/admin validation.
Yasaklar: `any` yok, unrelated dirty worktree revert yok, yeni auth modeli yok, fake push success yok, existing notification history'yi silmek yok.
Standartlar: AGENTS.md, explicit error handling, minimal diff, zero-trust backend semantics, deployable migration.

## Announcement Push Reliability + Dashboard Locale Cohesion Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- `npm --prefix apps/admin run smoke:announcement-push` if local Supabase stack is available

## Current Plan (Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Ayni eventte ayni mekandan kazanilan ikinci leimanin UI'da gorunmesini sagla, public brand navigation'i duzelt, pricing'i tek aylik 29.99 EUR Stripe subscription paketine indir ve apply/login/contact Turnstile entegrasyonunu implicit render ile daha dayanikli hale getir.

## Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience Architectural Decisions

- `EventVenueSummary` backend kontrati bozulmadan genisletilecek; venue-level gorunum korunurken ayni business icin `collectedStampCount` ve en son `stampedAt` agregasyonu detail query katmaninda hesaplanacak.
- `StudentLeimaPassCard` slotlari venue listesinden degil, `collectedStampCount` kadar expand edilmis stamp slot setinden uretecek. Modal ayni venue bilgisiyle acilmaya devam edecek.
- Public navbar brand link'i locale-aware `getPublicHomeHref(locale)` kullanacak; hash-scroll mantigi brand seviyesinden kaldirilacak.
- Public pricing tek self-serve pakete inecek: 29.99 EUR monthly business subscription. Stripe Checkout `mode: "subscription"` ve `price_data.recurring.interval = "month"` ile hosted session uretecek.
- Stripe tax mantigi official hosted Checkout yolu ile korunacak: `automatic_tax`, `billing_address_collection`, `tax_id_collection`. Subscription mode icin gereksiz payment-only alanlar route'tan cikacak.
- Cloudflare Turnstile client widget'lari explicit JS render yerine implicit `cf-turnstile` markup ile kurulacak. Token okuma submit aninda form/container uzerinden yapilacak; reset varsa global `turnstile.reset()` ile alinacak.
- Scanner owner-QR provisioning bugfixlerle ayni patch'e zorla sokulmayacak. Mevcut `business_scanner_devices` yapisi ve `auth.uid()` tabanli scan kontrati once netlestirilecek, sonra ayri backend/mobile slice olarak uygulanacak.

## Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience Edge Cases

- Ayni business'ten toplanmis stamp sayisi minimum stamp hedefini asabilir; UI slot expansion'i `minimumStampsRequired` uzerine cikmamak icin cap uygulanmali.
- Bazi eventlerde hic stamp yokken `collectedStampCount` kesinlikle `0` olmali; pending venue slot'lari bozulmamali.
- Subscription checkout'ta olden kalma package key veya old route consumer'i gelirse route acik hata donmeli; sessiz fallback ile eski paket satin almasi yapilmamali.
- Implicit Turnstile widget hidden input token'i her zaman ayni isimle gelmeli; token okunamazsa form fail-closed davranmali.
- Apply/contact/login formlarinda Turnstile reset cagrisi script henuz inject olmadan da guvenli olmali.
- Unpaid business deactivation istendigi icin pricing copy bunu anlatabilir; fakat gercek access suspension icin webhook + billing state lazimdir. Bu slice'ta checkout kurulsa bile tam hesap kapatma enforcement'i ayri backend isi olarak kalabilir.

## Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience Prompt

Sen bir Expo React Native UI veri-akisi ve Next.js/Stripe/Cloudflare checkout hardening uzmanisin.
Hedef: OmaLeima'da ayni business'ten gelen ikinci leimanin leima-pass UI'inda kaybolmasini duzelt, public brand'i her sayfadan dogru ana sayfaya yonlendir, pricing'i tek aylik 29.99 EUR recurring Stripe Checkout paketine indir ve apply/login/contact Turnstile entegrasyonunu CSP/Trusted Types ile daha uyumlu implicit render modeline gecir.
Mimari: mevcut student event detail query katmani, `StudentLeimaPassCard`, public-site content + pricing checkout route'u, Cloudflare Turnstile server-side validation route'lari ve mevcut shared public/auth form yapisi korunur.
Kapsam: mobile student leima-pass/event-detail tipleri, public navbar, pricing content/package/checkout route'u, business application form, contact form, admin login Turnstile client katmani, calisma dokumanlari ve validation.
Cikti: strict typed TS/TSX degisiklikleri, gerekli minimal content copy update'leri, temiz mobile/admin validation, gerekiyorsa production deploy ve apply/pricing smoke notlari.
Yasaklar: `any` yok, unrelated dirty worktree revert yok, fake payment success yok, old package fallback yok, scanner auth modelini yarim yamalak degistirmek yok.
Standartlar: AGENTS.md, official Stripe Checkout subscription docs, official Cloudflare Turnstile implicit rendering guidance, explicit error handling, minimal diff.

## Leima Pass Count + Monthly Pricing + Apply Turnstile Resilience Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- production checkout smoke should return a hosted Stripe subscription URL
- hosted `/apply` page should render the implicit Turnstile widget without the old explicit-render crash path

## Current Plan (Stripe Live Checkout + Event Stamp Limit Parity)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Stripe live checkout'u production'da gercekten calistir, reminder warning fix'inin yerinde kaldigini dogrula ve same-venue stamp limit kurallarini mobile/web organizer yuzeylerinde veri kaybi olmadan tutarli hale getir.

## Stripe Live Checkout + Event Stamp Limit Parity Architectural Decisions

- Pricing checkout App Router route'u hosted Stripe Checkout Session uretmeye devam eder; ancak live-mode sorunlarini kapatmak icin invalid `customer_update` kaldirilir ve inline `price_data.tax_behavior` acikca `exclusive` verilir.
- Stripe env values source-of-truth olarak Vercel production env'lerinde tutulur; route fix'i production'a fresh deploy ile tasinir ve sonrasinda canlı endpoint smoke'u yapilir.
- Mobile organizer event draft'i, UI'da gosterilmese bile mevcut `rules` JSON'unu form state'inde tasiyacak; update/create sirasinda sadece `stampPolicy.perBusinessLimit` degismis gibi merge edilecek, baska rule anahtarlari silinmeyecek.
- Legacy `stampPolicy.perBusinessLimit` digit-string degerleri mobile dashboard parse katmaninda, web builder'da ve web validation'da normalize edilerek sayiya cevrilecek.
- Web builder copy'si "same venue total stamp limit" olarak aciklastirilacak; boylece kuralin "bir scan kac stamp verir" degil "aynı isletmeden toplam kac stamp toplanabilir" mantiginda oldugu daha net olacak.

## Stripe Live Checkout + Event Stamp Limit Parity Edge Cases

- Stripe route fix'i deploy edilmeden production smoke hala eski 500'i dondurebilir; smoke tarihi deploy sonrasina ait olmalidir.
- Inline `tax_behavior: "exclusive"` demek fiyatlari net pilot fiyat olarak tutar; checkout'ta VAT ustune eklenir. Bu, Finlandiya B2B pilot modeliyle uyumludur ama ileride B2C sabit fiyat istenirse ayrica gozden gecirilmelidir.
- `rules` merge'i yapilirken `stampPolicy` altindaki olasi gelecekteki diger alanlar da korunmalidir; sadece `perBusinessLimit` degistirilmelidir.
- Legacy string-form event rules normalize edilmezse organizer unrelated edit yaptiginda limit istemeden `1`e inebilir veya request validation fail edebilir.

## Stripe Live Checkout + Event Stamp Limit Parity Prompt

Sen bir Stripe Checkout production rollout ve event-rules parity uzmanisin.
Hedef: OmaLeima pricing checkout'u live Stripe anahtarlariyla production'da gercekten calistir, Expo reminder warning fix'inin hala yerinde oldugunu dogrula ve same-venue stamp limit kuralini mobile/web organizer duzenleme akislari boyunca veri kaybi veya legacy-value bozulmasi olmadan koru.
Mimari: mevcut Next.js App Router pricing route'u, Vercel production env'leri, mevcut Expo reminder bridge, mobile club dashboard/form state'i, web event-rules builder ve mevcut rules JSON modeli korunur.
Kapsam: Stripe checkout route + production smoke, mobile club event draft/mutation/rules parse katmani, web rules builder/validation katmani, calisma dokumanlari ve ilgili validation.
Cikti: strict typed TS/TSX degisiklikleri, production deploy, gercek checkout smoke sonucu ve net parity notu.
Yasaklar: fake Stripe success yok, unrelated dirty worktree revert yok, mevcut rules blob'unu ezmek yok, `any` yok.
Standartlar: AGENTS.md, explicit error handling, minimal diff, live-smoke proof, backward-compatible rules normalization.

## Stripe Live Checkout + Event Stamp Limit Parity Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- `vercel deploy --prod --yes`
- Production `POST https://omaleima.fi/api/pricing/checkout` smoke should return `200` with a hosted Stripe Checkout URL.

## Current Plan (Student Event Detail + Reminder Warning Cleanup)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Student event detail ekranindaki yanlis timeline/rules sunumunu duzeltmek, reminder SecureStore warning'lerini kapatmak ve raporlanan event cover prefetch loglarini gercekten aktif problem mi diye dogrulamak.

## Student Event Detail + Reminder Warning Cleanup Architectural Decisions

- Student event detail timeline badge'i student listesiyle ayni mantigi kullanacak: `CANCELLED` haricindeki durumlarda source-of-truth zaman olacak (`startAt`/`endAt`), stale `status` label'lari future event UI'ini bozamayacak.
- Registration/cancellation availability logic'i de ayni zaman mantigina yaklastirilacak; iptal edilmis event yine kapali kalacak ama pre-start flow sadece `status !== PUBLISHED` gibi dar bir backend etikete baglanmayacak.
- Event rules icin yeni backend schema eklenmeyecek. Sadece mobile detail ekraninda `stampPolicy.perBusinessLimit` mevcut object/string/legacy array sekillerinden okunup insan-dostu aciklama metnine cevrilecek; diger rule tipleri mevcut stringify fallback ile kalabilir.
- Reminder bridge mimarisi korunacak. Sadece SecureStore key'i Expo'nun izin verdigi karakter setine alinacak.
- Event cover prefetch icin kullanicinin verdigi URL'ler once ag seviyesinde dogrulanacak; hala saglikli donuyorlarsa bu turda gereksiz kod degisikligi yapilmayacak.

## Student Event Detail + Reminder Warning Cleanup Edge Cases

- Event veritabani `status = COMPLETED` kalsa bile `startAt` gelecekteyse student detail `tulossa` gostermeli; aksi halde event listesi ve detail birbiriyle celisir.
- `stampPolicy` eski verilerde `["perBusinessLimit:2"]` veya `"perBusinessLimit:2"` olarak gelebilir; UI bunlari da anlamali.
- SecureStore key migration bu feature icin stateful veri kaybi yaratmaz; reminder fired record cache'i zaten yeniden kurulabilen, gecici bir istemci cache'idir.
- Prefetch warning URL'leri su anda saglikliysa, log temizlenene kadar eski cihaz loglari gorulebilir; bunu aktif product regression gibi raporlamamak gerekir.

## Student Event Detail + Reminder Warning Cleanup Prompt

Sen bir Expo React Native student event UX ve runtime warning temizligi uzmanisin.
Hedef: Student event detail ekraninda yanlis timeline badge'lerini ve ham `stampPolicy` gorunumunu duzelt, reminder bridge'in SecureStore warning kok nedenini kapat, paylasilan event cover URL'lerinin gercekten halen bozuk olup olmadigini dogrula.
Mimari: mevcut student detail query/hook'lari, mevcut event rules JSON modeli, Expo SecureStore ve mevcut remote-image-health verification helper'lari korunur; backend schema veya yeni dependency eklenmez.
Kapsam: `apps/mobile/src/app/student/events/[eventId].tsx`, `apps/mobile/src/features/notifications/student-event-reminders.ts`, gerekli calisma dokumanlari ve targeted mobile validation.
Cikti: strict typed TS/TSX degisiklikleri, acik runtime bulgu notu ve temiz mobile validation.
Yasaklar: yeni dependency yok, unrelated dirty worktree revert yok, fake fallback yok, `any` yok.
Standartlar: AGENTS.md, minimal diff, explicit error handling, student list/detail zaman mantigi tutarliligi.

## Student Event Detail + Reminder Warning Cleanup Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check -- 'apps/mobile/src/app/student/events/[eventId].tsx' apps/mobile/src/features/notifications/student-event-reminders.ts`

## Current Plan (Pricing Checkout + Announcement/Admin Reliability)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Public pricing'i Stripe Checkout ile gercek odemeye hazir hale getirmek, mobile login ve announcement detail yuzeylerindeki UX bosluklarini kapatmak ve organizer/admin panel aksiyonlarini guvenilir sekilde dogrulamak.

## Pricing Checkout + Announcement/Admin Reliability Architectural Decisions

- Public pricing icin Stripe Checkout Sessions kullanilacak. Stripe docs'un onerisi dogrultusunda hosted checkout tercih edilecek; custom card form veya Payment Intents gereksiz complexity yaratmayacak.
- Finlandiya genel ALV orani kodda hard-code hesaplanmayacak. Checkout session `automatic_tax: { enabled: true }`, `billing_address_collection: "required"` ve `tax_id_collection: { enabled: true }` ile acilacak; vergi hesaplamasini Stripe yapacak.
- Kullaniciya kontrolsuz recurring subscription acmayacagiz. Self-serve Stripe paketleri bir kerelik pilot/slot odemeleri olacak; daha buyuk premium surecler application/contact uzerinden kalabilir.
- Stripe product/price dashboard bagimliligi olmadan hizli ve deterministic kalmak icin pilot checkout paketleri server-side validated package key -> inline `price_data` map'i ile acilacak.
- Login language selector yeni state makinesi kurmayacak; mevcut `useUiPreferences()` icindeki `language` ve `setLanguage()` kullanilacak.
- Announcement detail zoom'u yeni dependency olmadan native `Modal` + `Image` ile cozulur; resim tum ekranda `contain` ile acilir, gorunen ikincil zoom butonu olmaz.
- Shared `AnnouncementsPanel` icindeki duzeltmeler hem `/club/announcements` hem `/admin/announcements` icin source-of-truth olacak. `Edit` compose tab'ina geri donecek; archive/send-push sonuclari listede gorunur kalacak; push metric parse'i client'ta korunacak.
- Panel auditinde once mevcut scriptler kosulacak; script coverage disinda kalan bulgular kod incelemesiyle not dusulecek.

## Pricing Checkout + Announcement/Admin Reliability Edge Cases

- Stripe secret/publishable key yoksa checkout route sessiz fallback yapmayacak; acik hata donecek ve public CTA bunu kontrollu sekilde gosterecek.
- `automatic_tax` kullanildigi icin checkout success toplaminda vergi alici lokasyonuna gore degisebilir; public pricing copy "VAT calculated in checkout" mantigini acikca belirtmeli.
- Club/admin announcements panelinde listeden `Edit` basinca form state dolu olsa bile kullanici ayni tab'ta kalirsa broken hissi surer; active tab explicit degismeli.
- `router.refresh()` sonrasi action mesajlari tamamen kaybolursa kullanici archive/push sonucunu gormez; success/error state'i listede kalacak sekilde ele alinmali.
- Smoke scriptler local/hosted auth durumuna gore kismen environment-dependent olabilir; fail eden script olursa teknik blocker acikca raporlanacak, false green yazilmayacak.

## Pricing Checkout + Announcement/Admin Reliability Prompt

Sen bir Next.js + Stripe Checkout + Expo mobile polish ve dashboard regression uzmanisin.
Hedef: OmaLeima public pricing alanini Finlandiya ALV mantigina uygun Stripe checkout akisina bagla, mobile login'e kalici dil secici ekle, announcement detail image zoom UX'ini sadeleştir ve shared organizer/admin announcements panelindeki kirik veya kirik gorunen aksiyonlari kapat; ardindan organizer/admin panel yuzeylerini mevcut smoke katmani ile yeniden dogrula.
Mimari: Next.js App Router route handler, Stripe Checkout Sessions, mevcut public landing content sistemi, Expo `useUiPreferences`, native modal/image, shared `AnnouncementsPanel` component ve mevcut admin smoke scriptleri kullanilir.
Kapsam: public pricing/public-site dosyalari, Stripe route/helper/env docs, mobile login + announcement detail dosyalari, shared announcements/admin dashboard dosyalari, calisma dokumanlari, validation ve deploy.
Cikti: strict typed TS/TSX degisiklikleri, gerekli package/env updates, temiz mobile/admin validation, smoke sonuclari ve production deploy.
Yasaklar: recurring subscription'ı kullaniciya gizlice acmak yok, hard-coded VAT math ile Stripe tax'i bypass etmek yok, fake success yok, unrelated dirty worktree revert yok, `any` yok.
Standartlar: AGENTS.md, official Stripe/Vero guidance, minimal diff, explicit error handling, source-of-truth shared panel logic.

## Pricing Checkout + Announcement/Admin Reliability Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/admin run smoke:routes`
- targeted admin/club smoke scripts where environment allows
- `git --no-pager diff --check`

## Current Plan (Student Event Time Awareness + Venue Discovery)

- **Date:** 2026-05-06
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Student event akisini zaman-duyarli hale getirmek, kayitli ogrenciye son 60 dakika reminder + countdown eklemek, event detail venue kesfini iyilestirmek ve leaderboard/leima-pass geri bildirim bosluklarini kapatmak.

## Student Event Time Awareness + Venue Discovery Architectural Decisions

- `useStudentEventsQuery` fetch kontrati korunacak; event listesi query sonucunu local `now` ile tekrar bucket'layarak `UPCOMING -> ACTIVE -> hidden` gecislerini manuel refresh olmadan gosterecek.
- Countdown gorseli sadece kayitli upcoming eventlerde ve `startAt - now <= 60 dakika` oldugunda render edilecek.
- Event reminder server push ile yeniden kurulmayacak; mevcut Expo local notification altyapisi uzerinden `startAt - 60 dakika` icin stable identifier'li schedule, gec kalinmis durumlarda da bir kere immediate local reminder uygulanacak.
- Reminder dedupe icin mevcut dependency set icinde `expo-secure-store` kullanilacak; yeni paket eklenmeyecek.
- Event detail `Ilmoittautuminen` blogu sadece event henuz baslamamissa render edilecek.
- Event venue listesi compact pressable kartlara donusecek; secilen venue modal'inda adres, durum, varsa instructions, event reward summary ve harita aksiyonu gosterilecek.
- Leaderboard tarih filtresi event selector'u bozmadan chip seviyesinde olacak; secilen tarih grubuna gore event rail daralacak ve secim gecersiz kalirsa uygun default event'e donecek.
- Leima pass slot'lari collected venue icin pressable olacak; kucuk modal venue adini ve stamp baglamini gosterecek.

## Student Event Time Awareness + Venue Discovery Edge Cases

- Query fetch aninda `ACTIVE` olan bir event ekranda zaman ilerledikce `COMPLETED` olup listeden dusmeli; stale query sonucuna ragmen local bucket yeniden hesaplanacak.
- User app'i reminder saatinden once acmissa notification future trigger ile schedule edilecek; user son 60 dakika icinde ilk kez app'e gelirse immediate local notification yalnizca bir kez gosterilecek.
- Event saati veya event listesi degisirse eski scheduled reminder'lar iptal edilmeli; stale local notification kalmamali.
- Event detail direct deep link ile acildiginda `now` bazli hide/show karari ayni sekilde calismali.
- Venue reward modeli event-level; venue modal bunu venue-specific gibi yanlis temsil etmemeli.
- Leaderboard tarih filtresi event setini sifirlarsa kullaniciya bos hata vermek yerine uygun fallback event secimi yapilmali.

## Student Event Time Awareness + Venue Discovery Prompt

Sen bir Expo React Native ogrenci deneyimi ve event-day operasyon uzmanisin.
Hedef: Student Events ekraninda eventleri zaman ilerledikce otomatik dogru bolume tasiyan UI kur, kayitli ogrenciye son 60 dakikada countdown ve local reminder goster, event detail'de baslangic sonrasi kayit blogunu kaldir, venue kesfini compact kart + detail/map akisina cevir, leaderboard'a hafif tarih filtresi ekle ve leima pass'te mekan kimligini popup ile goster.
Mimari: mevcut React Query event/detail sorgulari, Expo local notifications, SecureStore, mevcut student venue/reward surface'leri ve mevcut design language korunur; backend tablo/RPC eklenmez.
Kapsam: mobile student event list/detail/leaderboard/leima-pass dosyalari, gerekli push helper/bridge katmani, calisma dokumanlari ve mobile validation.
Cikti: strict typed TS/TSX degisiklikleri, yeni reminder bridge/helper'lari ve temiz lint/typecheck.
Yasaklar: yeni dependency eklemek yok, fake fallback yok, reward/scan backend kontratini degistirmek yok, unrelated dirty worktree revert yok, `any` yok.
Standartlar: AGENTS.md, minimal diff, explicit error handling, time-aware UI, one-time reminder dedupe.

## Student Event Time Awareness + Venue Discovery Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

## Current Plan (Login Protection + Pricing/Business Intake)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Admin login'i Cloudflare Turnstile ile guclendirmek, Finland-only erisim kararini guvenli sekilde opsiyonel yapmak, pricing/business paketini public site'a koymak ve isletme basvurularini admin queue'ya gercekten baglamak.

## Login Protection + Pricing/Business Intake Architectural Decisions

- Login Turnstile token'i server-side `/api/auth/turnstile` endpoint'inde validate edilir; password ve Google auth ancak bu preflight gectikten sonra baslar.
- Contact formdaki mantikla uyumlu shared Turnstile validator ve client IP helper kullanilir; secret sadece server-side okunur.
- Finland-only erisim hard-coded kapatma olarak uygulanmaz. `OMALEIMA_GEOFENCE_MODE=off|admin|all` proxy guard'i eklenir; default `off`, onerilen ilk production modu `admin`.
- Public business application intake yeni `/apply` ve `/en/apply` sayfalarindan gider. API service role ile `business_applications` insert eder, Turnstile ve same-origin kontrolu uygular.
- Pricing public landing'de yayinlanir, ancak Stripe tahsilati fake checkout ile acilmaz. CTA'lar application flow'a gider; Stripe Checkout Payment Links veya Price IDs netlesince bu planlar checkout'a baglanabilir.
- Admin business applications paneli approval sonrasi business profile + scanner credential handoff surecini aciklar.
- Announcement popup "View more/Näytä lisää" local dismiss state set eder ve sonra detail route'a gider.

## Login Protection + Pricing/Business Intake Edge Cases

- Local development'ta Turnstile secret yoksa validator safe-open davranir; hosted/Vercel ortaminda secret eksikse login/apply/contact fail-closed olur.
- Geofence country header'i yoksa request allowed kalir; bu local/dev ve botched proxy header durumunda false negative'i false positive'e tercih eder.
- `OMALEIMA_GEOFENCE_MODE=all` public website ve API'yi Finlandiya disindan kapatabilir; App Store review ve yurt disi kullanicilar icin risklidir. Varsayilan kapali kalmalidir.
- Business application API public anon RLS'yi acmaz; service role server route kullanir. Client dogrudan Supabase'e yazamaz.
- Stripe odeme almadan once vergi/fatura, urun/price id ve refund/contract metinleri netlesmelidir.

## Login Protection + Pricing/Business Intake Prompt

Sen bir Next.js/Supabase/Cloudflare Turnstile ve B2B onboarding uzmanisin.
Hedef: OmaLeima admin login'e server-side Turnstile preflight ekle, Finland-only access'i opsiyonel ve kontrollu hale getir, public pricing paketlerini yayinla, isletme basvuru formunu admin `business_applications` kuyruğuna bagla ve duyuru popup detail tiklamasinda popup'i kapat.
Mimari: Next.js App Router API route'lari, Supabase service role server-only insert, existing admin review queue, Cloudflare Turnstile Siteverify, Vercel/Cloudflare country headers ve mevcut public design system kullanilir.
Kapsam: admin login, public apply/pricing, business application admin explanation, mobile announcement popup, docs and validation.
Cikti: strict TS/TSX/CSS, yeni `/apply` sayfalari, `/api/business-applications`, `/api/auth/turnstile`, optional proxy geofence ve temiz validation.
Yasaklar: fake Stripe payment yok, public direct Supabase insert policy yok, secret degeri yazdirmak yok, Finland geofence'i default production'da tum siteye zorlamak yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, server-side Turnstile validation, zero-trust backend, minimal diff, explicit product risk notes.

## Login Protection + Pricing/Business Intake Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
- Production smoke after deploy: `/login` Turnstile widget + preflight, `/apply` successful Turnstile submit creates a pending admin application.

## Current Plan (QR Refresh + Navigation/Layout Regression)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** My QR refresh error root cause'i kapatmak, announcement detail navigation/zoom davranisini role-aware yapmak, admin/organizer web shell'ini fixed ve dil olarak stabil hale getirmek.

## QR Refresh + Navigation/Layout Architectural Decisions

- `generate-qr-token` call existing hosted Edge Function kontratini kullanmaya devam eder; sadece gateway icin gerekli `apikey` header'i eklenir.
- QR UI generic friendly error'u korur ama altinda actual function/gateway message'i selectable olarak gosterir; silent failure yok.
- Announcement detail back button stack history'ye guvenmez; caller tarafindan verilen `backHref` role source-of-truth olur.
- Announcement image zoom icin visible button kaldirilir; hero image full tap target olur ve modal full-frame image gosterir.
- Dashboard desktop sidebar document flow'dan cikarilip fixed viewport rail olur; menu listesi kendi icinde scroll eder, sign out sabit kalir.
- Dashboard locale default'u Finnish olur; panel locale okuyan sayfalar ayni locale'i shell'e de gecerek duplicate/karisik resolution'i azaltir.

## QR Refresh + Navigation/Layout Edge Cases

- Edge Function hala `EVENT_ENDED`, `UNAUTHORIZED`, `NOT_REGISTERED` gibi domain hatalari donebilir; UI artik bu detayi saklamaz.
- Detail sayfasina direct deep link ile girilirse backHref yine role route'una replace eder, bos/native stack'e bagli kalmaz.
- Mobile/tablet dashboard breakpoint'lerinde sidebar tekrar relative flow'a doner; fixed davranis desktop'a ozeldir.
- Locale cookie yoksa artik Finnish shell/nav/title gorunur. Kullanici switch'e basarsa HTTP-only cookie ile English kalici olur.

## QR Refresh + Navigation/Layout Prompt

Sen bir Expo React Native + Next.js dashboard regression uzmanisin.
Hedef: Student My QR ekraninda token refresh'in hosted Supabase Edge gateway tarafindan reddedilmesini onle, hata detayini gorunur yap, announcement detail back/zoom UX'ini role-aware hale getir ve admin/organizer web dashboard sidebar/dil stabilitesini duzelt.
Mimari: mevcut Edge Function, Expo Router detail route'lari, React Query QR hook'u, DashboardShell ve cookie-backed dashboard locale sistemi korunur; backend tablo/RPC degismez.
Kapsam: QR fetch/header ve QR hata UI'i, announcement detail back/zoom, dashboard shell CSS/i18n ve ilgili calisma dokumanlari.
Cikti: strict typed TS/TSX/CSS degisiklikleri ve clean mobile/admin validation.
Yasaklar: unrelated dirty work revert yok, fake fallback yok, default language'i sayfa bazinda hard-code dagitmak yok, RLS/Auth kontratini gevsetmek yok.
Standartlar: AGENTS.md, minimal diff, explicit error reporting, role-aware navigation, fixed desktop shell.

## QR Refresh + Navigation/Layout Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`

## Current Plan (Student Info IA + Turnstile Production Finish)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Student mobile information architecture'i sadeleştirmek ve Turnstile production rollout'u env/deploy seviyesinde tamamlamak.

## Student Info IA Architectural Decisions

- Student tab route'u `events` olarak kalacak; sadece Finnish tab title `Eventit` olacak. Events page title/copy `Tapahtumat` olarak korunur.
- `Miksi OmaLeima` login hero rail'ine dorduncu image-backed onboarding slide olarak tasinir; Events page'deki value card kaldirilir.
- Duyurularin ana yeri student `updates`/Info olur. Events page announcement rail'i kaldirilir; Info'daki feed `presentation="rail"` ile yatay, kendi icinde kayan `Tiedotteet` alanina donusur.
- `PublicClubDirectorySection` Info'da kalir ve existing horizontal rail davranisini korur.
- Turnstile env'leri Vercel production'a eklenir, production deploy alinir, hosted env check'in build'de gecmesi ve `/contact` HTML/API fail-closed davranisi dogrulanir.

## Student Info IA Edge Cases

- Kisa FI tab label narrow iPhone'da tasmazken Events route ve deep linkler etkilenmez.
- Info sayfasinda user yoksa announcement section zaten render olmaz; club directory query de `isEnabled` ile kapali kalir.
- Contact submit token olmadan basarili sayilmamalidir; `Verification failed` response istenen fail-closed davranistir.
- Gercek basarili Turnstile submit smoke icin browser'da widget token'i uretilmelidir; headless/tokenless curl bunu kanitlayamaz.

## Student Info IA Prompt

Sen bir Expo React Native information architecture ve Vercel/Turnstile rollout uzmanisin.
Hedef: Student mobile'da tab label overflow'u duzelt, Events sayfasindaki duplicate value/announcement yuzeylerini dogru sayfalara tasi, Info sayfasini yatay Tiedotteet + scrollable opiskelijaklubit merkezi yap ve Turnstile production env/deploy adimini tamamla.
Mimari: mevcut Expo Router tablari, login `LoginHero` auto rail, `AnnouncementFeedSection`, `PublicClubDirectorySection`, Vercel production env ve Next.js contact API korunur. Yeni backend tablo/RPC yok.
Kapsam: student tab/events/updates/login-copy mobile dosyalari, Vercel env/deploy, contact smoke notlari ve calisma dokumanlari.
Cikti: strict typed TS/TSX copy/layout degisiklikleri, temiz mobile/admin validation, production deploy ve acik smoke sonucu.
Yasaklar: route rename yok, secret degeri log/final tekrar yok, fake Turnstile token yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, minimal diff, explicit validation, fail-closed contact security.

## Student Info IA Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Vercel production env list should show both Turnstile names.
- Production deploy should pass hosted env check.
- `/contact` page should include Turnstile script/sitekey and `/api/contact` should fail closed without a token.
- `git --no-pager diff --check`

## Current Plan (Announcement Realtime Crash + Turnstile Retry)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Physical iPhone'da announcement feed'i crash ettiren Supabase Realtime channel reuse problemini duzeltmek ve Cloudflare Turnstile key rollout'unun gercek durumunu netlestirmek.

## Announcement Realtime Crash Architectural Decisions

- Announcement realtime query invalidation ayni kalacak; sadece channel topic'i hook instance'a ozel yapilacak.
- Channel suffix'i guvenlik amacli degil, runtime topic collision onleme amacli olacak; DB/RLS veya publication davranisi degismeyecek.
- Turnstile production key'leri yoksa Vercel'e sahte/test key eklenmeyecek. Production contact smoke ancak real Cloudflare auth/key ile kapanacak.

## Announcement Realtime Crash Edge Cases

- Ayni ekranda birden fazla announcement feed mount edilirse her hook instance kendi channel'ina subscribe olur, ama ayni user query key'lerini invalidate eder.
- Hot reload veya native error recovery sonrasi eski channel topic'i subscribed kalirsa yeni instance farkli topic ile crash'i tetiklemez.
- User id degisirse effect cleanup eski channel'i remove eder ve yeni user icin yeni topic kullanilir.
- Cloudflare auth hatasi devam ederse contact form hosted ortamda fail-closed kalir; bu guvenlik olarak tercih edilir.

## Announcement Realtime Crash Prompt

Sen bir Expo React Native + Supabase Realtime runtime regression uzmanisin.
Hedef: iPhone'da announcement feed acilirken gorulen `cannot add postgres_changes callbacks after subscribe()` render crash'ini, query/read modelini bozmadan duzelt; Cloudflare Turnstile production key durumunu guvenli sekilde tekrar dene.
Mimari: mevcut React Query invalidation hook'u, Supabase Realtime `postgres_changes`, hosted `supabase_realtime` publication ve Vercel env modeli korunur. Sadece channel topic collision onlenir.
Kapsam: `apps/mobile/src/features/announcements/announcements.ts`, calisma dokumanlari, mobile type/lint validation ve Cloudflare/Vercel env durum raporu.
Cikti: strict typed TS degisikligi, temiz mobile validation ve acik Turnstile blocker notu.
Yasaklar: fake Turnstile key production'a eklemek yok, RLS bypass yok, announcement query semantigini degistirmek yok, secret degerlerini loglamak yok, unrelated worktree degisikliklerini revert yok.
Standartlar: AGENTS.md, minimal diff, explicit blocker reporting, mobile runtime stability.

## Announcement Realtime Crash Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
- Cloudflare Turnstile widget list retry through MCP; if auth fails, document blocker without mutating Vercel env.

## Current Plan (Business/Admin Workflow Parity Polish)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Business mobile ve admin/organizer web yuzeylerinde kullanicinin bildirdigi akisi belirsiz, fazla yer kaplayan ve eksik gorunen noktalarini minimal riskle toparlamak.

## Business/Admin Workflow Parity Architectural Decisions

- Business mobile `Laitteet` existing scanner device read/mutation hooks ile kalacak; yalnizca collapsible shell eklenecek.
- Business history accepted rows daha kompakt olacak; valid scan detail copy tekrari kaldirilacak, review/revoked aciklamalari korunacak.
- Event cover upload web client tarafinda Supabase browser client + `event-media` storage bucket ile yapilacak; event save payload'i yine `coverImageUrl` string kontratini kullanacak.
- Business applications page backend lifecycle'i UI icinde aciklayacak; yeni tablo veya public intake form bu slice'ta eklenmeyecek.
- Rewards page event-bound mantigi bir workflow karti ve "Create reward for this event" aksiyonu ile gorunur kilacak.
- Sidebar fixed behavior CSS ile cozulur; dashboard component API degismez.
- Dashboard FI/EN destegi once server-side shell seviyesinde kurulacak: HTTP-only cookie, guvenli locale route, nav/title/subtitle dictionary ve sidebar switch. Ardindan kullanicinin isaret ettigi uc kritik workflow paneli (`business-applications`, `club/events`, `club/rewards`) locale prop ile cevrilecek.
- Kalan admin/organizer panelleri ayni `DashboardLocale` pattern'iyle sonradan tasinacak; bu turda tum panel detay copy'leri yarim yamalak cevrilip teknik borc buyutulmayacak.

## Business/Admin Workflow Parity Edge Cases

- Event cover upload basarili olsa bile update formunda kullanici "Save event" basmadan event kaydi degismemeli; UI bunu mesajla belirtir.
- Storage upload path `clubs/{clubId}/events/...` olmalidir; mevcut RLS policy bu path'ten club organizer/admin yetkisini kontrol eder.
- Scanner devices collapsed olsa bile query calismaya devam eder; header count kullaniciya durum verir.
- Valid history cards compact olurken manual review/revoked detail kaybolmamali.
- Business applications bos queue durumunda bile "nasil gelir" aciklamasi gorunmeli.
- Dashboard locale route sadece `/admin` ve `/club` altina redirect etmeli; open redirect'e izin vermemeli.
- Protected sayfalar local Supabase kapaliyken browser auth smoke'a girmeyebilir; i18n route/cookie ve static dictionary smoke yine kosulmali, gercek UI smoke hosted/local auth ortaminda tamamlanmali.

## Business/Admin Workflow Parity Prompt

Sen bir Expo React Native + Next.js/Supabase urun akisi polish uzmanisin.
Hedef: Business mobile devices/history yogunlugunu azaltmak, admin business applications lifecycle'ini aciklamak, organizer event cover image upload'u bilgisayardan calisir hale getirmek, reward tiers'in event'e nasil baglandigini gorunur yapmak, admin sidebar'i sabit boyutta tutmak ve admin/organizer web icin kalici FI/EN dashboard temelini kurmaktir.
Mimari: mevcut hooks, Supabase storage RLS, Next.js client components, server-side dashboard shell, HTTP-only locale cookie ve shared dashboard CSS korunur; yeni backend tablo/RPC eklenmez.
Kapsam: sadece bildirilen business mobile ve admin/club web workflow UI dosyalari, calisma dokumanlari ve validation.
Cikti: strict TS/TSX/CSS degisiklikleri, yeni event media upload helper'i ve temiz typecheck/lint/diff-check.
Yasaklar: scanner/scan/reward backend kontratini degistirmek yok, kalan paneller tamamen cevrilmis gibi davranmak yok, open redirect yok, unrelated dirty worktree revert yok, default parameter yok, `any` yok.
Standartlar: AGENTS.md, minimal diff, explicit errors, Supabase storage policy path'iyle uyum, existing design language.

## Business/Admin Workflow Parity Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Dashboard i18n static smoke for FI shell/nav copy.
- `curl` locale route smoke for `Set-Cookie` + safe dashboard redirect.
- `git --no-pager diff --check`

## Current Plan (Announcement Delivery + Contact Hosted Follow-up)

- **Date:** 2026-05-05
- **Branch:** `feature/announcement-delivery-polish`
- **Goal:** Hosted contact rollout'u mumkun olan yere kadar tamamlamak; mobil duyurularin popup/detail/realtime akisini guclendirmek; organizer tarafinda completed eventleri gorunur yapmak.

## Announcement Delivery + Contact Hosted Architectural Decisions

- Contact production rollout yalanci smoke ile kapatilmayacak. Gercek Cloudflare Turnstile sitekey/secret yoksa production deploy ve submit smoke bekletilecek.
- Hosted contact SQL dogrudan linked DB'ye uygulanacak ve migration history yalniz ilgili migration versionlari icin repair edilecek; daha once pending gorunen scanner migration'larina bu slice dokunmayacak.
- Announcement realtime, mevcut Supabase Realtime + React Query invalidation pattern'ine eklenecek. UI kendi query'lerini yeniden kullanacak; yeni tablo veya yeni endpoint yok.
- Popup bir preview olarak kalacak: body sinirli satirla gorunecek, close acknowledgement yapacak, "Näytä lisää / View more" uygulama ici detail route'una gidecek.
- Detail image zoom native modal ile cozulur; yeni dependency eklenmez.
- Student Events sayfasi announcement feed'i compact rail olarak gosterecek; ana News/Info sayfasi full feed olarak kalacak.
- Organizer Upcoming ekraninda `COMPLETED` filter chip'i eklenecek; default `ALL` hala aktif/tulossa/draft odakli kalacak, completed bilincli secimle gorulecek.

## Announcement Delivery + Contact Hosted Edge Cases

- Popup close butonu duyuruyu read/ack yapar; "View more" ack yapmaz, kullanici detayda okuyup isterse mark read yapar.
- Realtime channel RLS visibility'yi bypass etmemeli; UI sadece mevcut read modelini invalidate eder, data yine RLS'li query ile gelir.
- Announcement table `supabase_realtime` publication'da zaten varsa migration duplicate hata vermemeli.
- Club completed events default listeyi sisirmemeli; `COMPLETED` chip'i secilince gorunmeli.
- Turnstile test key kullanilmayacak; aksi halde contact form bot korumasi production'da gercekten etkin sanilabilir.

## Announcement Delivery + Contact Hosted Prompt

Sen bir Expo React Native + Supabase Realtime + hosted rollout uzmanisin.
Hedef: OmaLeima duyuru akisini ogrenci tarafinda popup preview, uygulama ici detay navigasyonu, detay gorsel zoom'u ve Events sayfasinda realtime gorunurluk ile tamamla; organizer tarafinda päättynyt/completed eventleri gorunur yap; hosted contact migration/env rollout'unu guvenli sekilde ilerlet.
Mimari: mevcut React Query read model, Supabase Realtime postgres_changes invalidation, Expo Router detail route'lari, mevcut InfoCard/CoverImageSurface komponentleri ve Supabase migration sistemi kullanilir.
Kapsam: announcement mobile UI/query/realtime, club upcoming completed filter, contact hosted env/migration smoke notlari ve validation. Scanner QR/RLS/reward logic veya unrelated public landing image work bu slice disinda.
Cikti: strict typed TS/TSX/SQL degisiklikleri, hosted migration proof, mobile typecheck/lint, acik Turnstile blocker notu.
Yasaklar: fake Turnstile/test-key production smoke yok, service role secret yazdirmak yok, unrelated dirty worktree revert yok, genis refactor yok, client-side RLS bypass yok.
Standartlar: AGENTS.md, minimal diff, explicit failure/blocker reporting, Supabase zero-trust/RLS, Expo native UX, no silent failures.

## Announcement Delivery + Contact Hosted Validation Plan

- Hosted Vercel env list: `SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_IP_HASH_SECRET` added; Turnstile pair missing until Cloudflare auth works.
- Hosted Supabase contact migration SQL + RLS/storage verification.
- Hosted Supabase announcement realtime publication SQL + publication verification.
- `npm --prefix apps/mobile run typecheck`
- Scoped mobile ESLint for changed announcement/student/club files.
- `git --no-pager diff --check`

## Current Plan (Public Landing Image Sharpness)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Hero ve "Approkulttuuri elaa" galerisi gorsellerindeki blur sorununu kaynak boyut, Next image `sizes`, ve compression seviyesi acisindan duzeltmek; sonra tekrar production deploy almak.

## Public Landing Image Sharpness Architectural Decisions

- Kullanicinin rapor ettigi yuzeyler once canli DOM/image inspection ile dogrulandi; cozum tahminle degil browser'in gercek `currentSrc` secimiyle verilecek.
- Public galeri tek bir `sizes` string ile gitmeyecek. `wide` ve `normal` item'lar farkli render genisligine sahip oldugu icin `span` bazli `sizes` hesaplanacak.
- Hero ve galeri gorsellerinde kalite `q=75` seviyesinden daha yukari cekilecek. `unoptimized` veya global image pipeline kapatma yerine kontrollu bir `quality` artisi tercih edilecek.
- Layout ve tema korunacak; sadece image delivery katmani duzeltilecek.

## Public Landing Image Sharpness Edge Cases

- `public-gallery-wide` item'lar desktop'ta 2 kolon kapladigi icin `33vw` bildirmek net sekilde yanlis; mobil/tablet kirilimlarinda da bu yeni `sizes` string dogru davranmali.
- Source asset'lerin cogu `1672x941`; bu yuzden cok buyuk retina ekranlarda sifir blur garantisi yok. Ama hatali `1080w` indirme davranisi kapandiginda gozle gorulur kalite artisi olmali.
- Hero source boyutu kodda yanlis tanimliysa onu current bitmap ile hizalamak gerekir.

## Public Landing Image Sharpness Prompt

Sen bir Next.js image delivery ve responsive media quality uzmanisin.
Hedef: OmaLeima public landing ana sayfasindaki bulanik gorunen hero ve "Approkulttuuri elaa" galerisi gorsellerinin kok nedenini bulup duzeltmek.
Mimari: canli browser inspection ile `currentSrc`, `clientWidth`, ve source resolution karsilastirilir; `Image` component'lerinde `span` bazli dogru `sizes` tanimlanir; gerekli yuzeylerde daha yuksek `quality` kullanilir; layout korunur.
Kapsam: `landing-page.tsx`, ilgili calisma dokumanlari, validation ve deploy. Yeni tasarim, yeni backend veya asset havuzu degisikligi bu slice disinda.
Cikti: keskinligi artirilmis image delivery, clean validation, production deploy ve kok neden notu.
Yasaklar: unrelated refactor yok, image pipeline'i tamamen bypass etmek yok, gercekte test edilmemis varsayimi cozum gibi sunmak yok.
Standartlar: AGENTS.md, minimal diff, browser-verified reasoning, stable responsive layout, source-of-truth measurements.

## Current Plan (Contact Form Security + Business Package Follow-up)

- **Date:** 2026-05-05
- **Branch:** `feature/contact-form-hardening`
- **Goal:** Public contact formu production'a yakisir sekilde bot, direct Supabase bypass, dosya upload ve admin review risklerine karsi sertlestirmek; Cloudflare Turnstile'i server-side validation ile eklemek; business paket anlatiminin yeni contact funnel ile uyumlu kalmasini saglamak.

## Contact Form Security Architectural Decisions

- Public client Supabase'e dogrudan contact submission veya attachment yazamayacak. Tüm submit akisi Next.js `/api/contact` route'undan gececek.
- API route'u hosted ortamda service role key ile DB/storage yazacak; bu key sadece server-side kullanilacak.
- Turnstile, reCAPTCHA yerine tercih edilecek: friction dusuk, Cloudflare tarafinda domain-bound token, server-side Siteverify ve action/hostname kontrolu var.
- Rate limiting in-memory degil DB-backed olacak: `ip_hash` + `created_at` penceresi uzerinden recent ve daily limit sayilacak.
- Local development icin Turnstile secret yoksa API submit'i dev ortamda calisabilir; hosted/Vercel ortaminda env check fail-fast olacak.

## Contact Form Security Edge Cases

- Turnstile tokenlari tek kullanimlik oldugu icin server 400/429/500 cevaplarindan sonra client widget reset edilmeli.
- Attachment upload basarili ama DB insert fail olursa orphan object kalmamasi icin upload cleanup denenmeli.
- Direct Supabase REST insert/upload denemeleri RLS ile reddedilmeli; anon insert/upload policy kalmamali.
- `cf-connecting-ip` varsa once o kullanilmali; yoksa `x-forwarded-for` ilk IP fallback'i ve son olarak `x-real-ip`.
- Hosted env eksikse form sessiz gecmemeli; build/prebuild veya API 503 ile acik hata vermeli.

## Prompt

Sen bir Next.js public form, Supabase RLS/storage ve Cloudflare Turnstile guvenlik uzmanisin.
Hedef: OmaLeima public contact formunu production icin harden et; client-side form UX'i korurken direct Supabase bypass'i kapat, Turnstile server-side verification ekle, DB-backed rate limit uygula, attachment upload'i service-role route'a tasi ve admin contact submissions yuzeyini bozmadan validation kos.
Mimari: Next.js App Router route handler, Supabase service-role server client, private storage bucket, RLS deny-by-default, Cloudflare Turnstile Siteverify ve mevcut contact form client component'i kullanilir.
Kapsam: contact API, public contact form/page content, contact migration policies, hosted env check/example, calisma dokumanlari ve validation. Scanner/mobile QR logic ve unrelated frontend polish bu slice disinda.
Cikti: strict typed TS/TSX/SQL degisiklikleri, clean admin typecheck/lint/build, focused contact route smoke ve security notes.
Yasaklar: `any` yok, client'a service role secret sizdirmak yok, anon direct DB/storage write yok, silent fallback yok, unrelated user commitlerini revert yok.
Standartlar: AGENTS.md, explicit errors, structured logs, Cloudflare official Turnstile server-side validation guidance, Supabase zero-trust RLS.

## Contact Form Security Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `git --no-pager diff --check`
- focused static checks: anon contact insert/upload policies absent, Turnstile token wired client->server, hosted env check requires contact secrets

## Current Plan (Business Growth Package + Background Push Readiness)

- **Date:** 2026-05-05
- **Branch:** `feature/business-growth-package`
- **Goal:** OmaLeima'yi Finlandiya ogrenci etkinlikleri icin ogrenci/organizer tarafinda kullanimi kolay, business tarafinda gelir uretebilir bir pilot paket olarak web ve mobile yuzeylerde anlatmak; push notification arka plan beklentisini mevcut Expo mimarisine uygun guclendirmek.

## Business Growth Package Architectural Decisions

- Public web copy `content.ts` icinde FI/EN source-of-truth olarak tutulacak; landing component sadece render edecek.
- Business model anlatimi public landing'de ayri `#model` section olacak ve nav'dan ulasilacak.
- Mobile tarafinda role-specific yuzeyler secilecek: student Events, club Home, business Home. Bu sayede auth, scanner, QR, reward veya admin data modeline yeni risk eklenmeyecek.
- Push icin yeni paket kurulmayacak; mevcut `expo-notifications` zaten dogru paket. Build-time plugin config'i ve backend payload defaults guclendirilecek.
- iOS visible remote notification ve silent/headless background notification ayrimi net tutulacak. Bu slice sadece gorunen reward/announcement/reminder notification message akisini optimize eder.

## Business Growth Package Edge Cases

- Android'de `channelId` yanlis verilirse kanal cihazda yoksa notification gorunmeyebilir; bu yuzden backend message'a explicit `channelId` eklenmeyecek, Expo/default channel davranisi korunacak.
- iOS'ta app force-quit edilirse standart alert notification OS tarafindan gosterilebilir, fakat JS listener calismasi app acilana/tap edilene kadar garanti degildir.
- Background/silent data-only push icin `_contentAvailable`, `expo-task-manager` ve iOS `remote-notification` background mode gerekir; bu urun ihtiyaci su an gorunen bildirim oldugu icin kapsam disi.
- Copy yeni gelir iddiasini abartmamali; verified traffic/reporting gibi olculebilir pilot degerleri kullanilmali.

## Prompt

Sen bir Expo React Native + Next.js growth/product engineer'isin.
Hedef: OmaLeima'ye Finlandiya appro/haalarit kulturu icin mantikli pilot business paketini web landing ve mobile role ekranlarina ekle; ogrenci, kulup/organizer ve business icin net deger onerisi yaz; mevcut push notification arka plan delivery beklentisini Expo resmi davranisina uygun guclendir.
Mimari: mevcut content-driven public landing, Expo Router mobile role screens ve Supabase Edge Function shared Expo push helper korunacak. Yeni backend tablo/RPC yok.
Kapsam: public landing model section, mobile student/club/business value cards, Expo notifications config/plugin defaults, Expo Push Service payload defaults, calisma dokumanlari ve validation.
Cikti: strict typed TS/TSX/CSS degisiklikleri, gerekiyorsa public image asset, temiz typecheck/lint/build/audit sonuclari.
Yasaklar: `any` yok, scanner/QR/RLS davranisini degistirmek yok, silent fallback yok, untracked/unrelated dosyalari revert yok, ogrenci veya organizer'a zorunlu ucret bariyeri anlatimi yok.
Standartlar: AGENTS.md, minimal diff, FI/EN copy, existing design language, visible notification message semantics, Expo official push behavior.

## Business Growth Package Validation Plan

- `git --no-pager diff --check`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run audit:native-push-device-readiness`
- `npm --prefix apps/mobile run audit:reward-notification-bridge`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/admin run smoke:announcement-push`
- `npm --prefix apps/admin run smoke:reward-unlocked-push`

## Current Plan (Manual QR Token Scanner Smoke)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** iOS Student QR token'ini manuel decode ederek hosted scanner endpoint'ine Android scanner context'iyle vermek, test stamp'ini temizleyip gercek scan success sonucunu almak ve Android scanner UI/native camera readiness blocker'ini kapatmak.

## Manual QR Token Scanner Smoke Architectural Decisions

- Hosted pilot data'da sadece kullanicinin onayladigi hedef stamp kaydi silinecek; genel event, registration, reward veya announcement datasina dokunulmayacak.
- Camera scan emulator/simulator sinirlarina takildigi icin token extraction sadece test harness olarak kullanilacak; product scanner transport yine mevcut `scan-qr` Edge Function kontratini kullanacak.
- Scanner device context Android emulator icin `register_business_scanner_device` RPC ile alinacak ve scan payload'inda yalnizca `scannerDeviceId` string'i kullanilacak.
- Android camera permission problemi native config root cause'i olarak kapatilacak; generated Android manifest smoke icin duzeltilecek, source of truth `apps/mobile/app.config.ts` olacak.

## Manual QR Token Scanner Smoke Edge Cases

- QR token kisa omurlu oldugu icin screenshot alindiktan sonra hemen decode + scan kosulmali; expired token sonucu test failure degil beklenen security behavior olarak ayrilacak.
- Scanner endpoint duplicate stamp yerine success verebilsin diye yalnizca ayni student/eventVenue/business stamp'i temizlenecek.
- Reward unlock gelmemesi endpoint failure degildir; reward threshold/event fixture mevcut stamp count'a gore yeni unlock uretmeyebilir.
- Android event selector carousel emulator gesture ile zor secilebilirse Expo Router deeplink `eventVenueId` parametresiyle scanner context dogrulanabilir.

## Manual QR Token Scanner Smoke Prompt

Sen bir Supabase/Expo mobile full-flow smoke uzmanisin.
Hedef: iOS Student QR ekranindan fresh QR token'i decode edip Android scanner hesabinin hosted context'iyle `scan-qr` Edge Function'a gondermek, test kullanicisinin eski leima kaydini hedefli temizleyip gercek `SUCCESS` stamp sonucunu almak ve Android scanner UI/camera permission readiness'ini dogrulamaktir.
Mimari: iOS Simulator + Computer Use screenshot, local QR decode harness, Supabase linked DB query, hosted scanner auth/RPC, Android Emulator/adb ve Expo dev-client birlikte kullanilir.
Kapsam: runtime smoke, minimal native config fix, generated Android smoke manifest, calisma dokumanlari ve validation. Unrelated frontend/admin/public-site degisiklikleri bu is disinda.
Cikti: scan response, DB stamp proof, iOS/Android screenshot proof'lari, Android camera permission root-cause fix'i ve final handoff.
Yasaklar: credential/token yazdirmak yok, genis hosted data silmek yok, false green yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, zero-trust scanner context, short-lived QR semantics, explicit proof gaps, minimal config diff.

## Manual QR Token Scanner Smoke Validation Plan

- Supabase linked DB targeted stamp select/delete/verify
- iOS QR screenshot decode
- hosted `scan-qr` manual token smoke with scanner auth/device/context
- Supabase linked DB new stamp verification
- Android scanner login and event context UI proof
- Android debug build/install after camera permission config fix
- `npm --prefix apps/mobile run typecheck`
- `JAVA_HOME=... ./gradlew app:processDebugManifest`

## Manual QR Token Scanner Smoke Result Notes

- Target old stamp deleted, fresh QR scan returned `SUCCESS`, new stamp id `3939cf41-49e4-495c-84dd-4702fcb464f5`, `stampCount = 1`, reward unlock push `NONE`.
- iOS Student QR screen updated to `1` leima for `Students Ready Party`.
- Android scanner login completed with pilot scanner credentials; selected context `Students Ready Party`.
- Android CAMERA permission blocker fixed in `apps/mobile/app.config.ts`; rebuilt dev-client manifest includes `android.permission.CAMERA` and scanner permission blocker disappeared after runtime grant.

## Current Plan (Full-Flow Device Smoke)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** iOS'ta Student Google PKCE login'i kullanici handoff'u ile tamamlayip QR/scan/reward/announcement smoke'a devam etmek; Android icin gerekli dev-client/native build zeminini olusturup emulator smoke almak.

## Full-Flow Device Smoke Architectural Decisions

- iOS dev-client icin kanitlanmis yol korunacak: `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.109`, LAN Metro ve `exp+omaleima-mobile` scheme.
- Student Google login'de kullanici credential girisini kendisi yapacak; ajan sadece Google sign-in'i baslatip callback sonrasi uygulama state'ini dogrulayacak.
- Android icin onceki blokaj artik kullanici tarafindan kaldirildi. `apps/mobile/android` yoksa `expo run:android`/prebuild generated native project olusturabilir; bu generated diff ayrica raporlanacak ve unrelated dosyalara revert uygulanmayacak.
- QR/scan full-flow iki session gerektirir. Student login tamamlandiktan sonra iOS simulator student QR uretici, Android emulator veya iOS business session scanner tarafi olarak kullanilacak.
- Gercek QR okutma simulator/emulator kamera sinirlarina takilirsa backend dynamic smoke sonucu ile UI QR generation/scanner-ready proof'u ayrilacak; false green yazilmayacak.

## Full-Flow Device Smoke Edge Cases

- Google OAuth browser akisi kullanici etkilesimi gerektirir; kullanici tamamlayana kadar beklenir ve credential degeri dokumanlara yazilmaz.
- iOS simulator'da onceki business session SecureStore'da kalmis olabilir; gerekirse UI sign-out veya app data reset ile student login yuzeyine donulur.
- Android generated project package id `fi.omaleima.mobile` ile uyumlu olmali; app install edilmeden smoke baslamis sayilmaz.
- Android emulator kamera QR okutma icin sanal sahne kullanir; fiziksel cihaz kadar guvenilir degildir. Emulator proof'u app launch/auth/UI proof'u, fiziksel cihaz proof'u ise son release gate kabul edilir.
- iOS simulator yeniden boot edilse bile SecureStore session korunursa Student Events ekranina geri donmesi PKCE callback/session persistence icin kabul edilecek kanittir.
- Android generated native project Gradle/SDK uyumsuzluguna takilirsa yalnizca smoke icin gereken minimal local build zemini duzeltilecek; product runtime logic degistirilmeyecek.
- Scanner camera scan zinciri emulator/simulator kamera sinirina takilirsa bu turda QR generation + scanner-ready + daha onceki dynamic scan smoke birlikte raporlanacak, fiziksel iki cihaz scan release gate olarak kalacak.

## Full-Flow Device Smoke Prompt

Sen bir Expo React Native release-readiness ve cross-platform device smoke uzmanisin.
Hedef: OmaLeima mobil uygulamasinda iOS Student Google PKCE login'i kullanici handoff'u ile tamamlamak, callback sonrasi student QR/reward/announcement yuzeylerini dogrulamak, scanner tarafi ile scan zincirini mumkun oldugu kadar gercek cihaz/simulator uzerinde kanitlamak ve Android icin eksik native dev-client zemini olusturup emulator smoke almaktir.
Mimari: Expo dev-client + LAN Metro, iOS Simulator/Computer Use, Android Emulator/adb, mevcut Supabase hosted pilot ortam ve daha once yesil olan dynamic security smoke sonuclari birlikte kullanilir.
Kapsam: runtime smoke, Android generated native build zemini, calisma dokumanlari ve validation. Public landing/legal slice, admin panel refactor ve unrelated mobile UI degisiklikleri bu is disinda.
Cikti: iOS/Android screenshot/log proof'lari, hangi akisin gectigi/bloklandigi ayrimi, generated Android dosya durumu ve final handoff.
Yasaklar: kullanici Google credential'ini kaydetmek yok, false green yok, unrelated dirty worktree revert yok, gereksiz manual backend bypass yok.
Standartlar: AGENTS.md, Expo dev-client production-like flow, PKCE code exchange, zero-trust scanner context, explicit proof gaps.

## Full-Flow Device Smoke Validation Plan

- LAN Metro status check
- iOS Student Google login handoff + callback proof
- iOS student QR/reward/announcement UI smoke
- Android emulator boot + `expo run:android` install/launch proof
- Android dev-client launch against LAN Metro
- `npm --prefix apps/mobile run typecheck`
- relevant mobile audit scripts where generated native project permits

## Full-Flow Device Smoke Result Notes

- iOS Student Google handoff tamamlandi. Kullanici Google tarafini bitirdikten sonra app Student Events ekranina authenticated olarak dondu; QR, Rewards, Community announcement listesi ve announcement detail yuzeyleri dogrulandi.
- Android `Pixel_9` emulator icin generated native project ile dev-client debug build kuruldu ve ayni LAN Metro bundle'i uzerinden OmaLeima Student sign-in ekrani acildi.
- Gradle wrapper smoke icin `8.14.3` seviyesine cekildi; Gradle 9 mevcut React Native/AGP toolchain ile `JvmVendorSpec IBM_SEMERU` uzerinden fail veriyordu. Local SDK path `apps/mobile/android/local.properties` ile verildi.
- Fiziksel/gercek kamera scan zinciri bu turda tamamlanmadi. Kalan gate: iki gercek cihazda student QR ile scanner camera scan, ardindan reward unlock sonucunu canli event uzerinde gormek.

## Current Plan (Public Landing Legal Pages + Footer + Visual Balance)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Public landing'in eksik desktop slotunu ve footer/legal eksiklerini tamamlayip, yasal sayfalari FI+EN olarak ekleyip production deploy almak.

## Public Landing Legal Pages + Footer + Visual Balance Architectural Decisions

- Landing server-rendered kalacak; yeni legal sayfalar App Router altinda ayri route'lar olarak eklenecek.
- Footer'daki legal item modeli string listesinden `label + href` yapisina cekilecek; ayni veri hem FI hem EN landing ve legal sayfalar tarafinda kullanilacak.
- Legal copy tek yerde typed content olarak tutulacak. Ayrica sayfa renderer'i ortaklasacak; route dosyalari yalnizca locale + document secimi yapacak.
- Footer tam-genislikte band olacak, icinde max-width inner grid bulunacak. Boylece kullanicinin istedigi "soldan saga kaplayan" his gelirken icerik satir uzunlugu kontrol altinda kalacak.
- Yeni dikey fotograf repo asset'i olarak kaydedilecek; production source dogrudan local machine path olmayacak.
- Privacy sayfasi yalnizca gercekten var olan public website processing surface'larini anlatacak: basic web requests/logs ve kullanici bize e-posta/Instagram ile ulasirsa gelen iletisim verileri. Repo'da analytics/cookie entegrasyonu gorunmedigi icin varmis gibi yazilmayacak.
- Terms sayfasi bu public site ve pilot/contact asamasi icin gecerli olacak. Ucretli son kullanici checkout veya app subscription flow'u varmis gibi davranilmayacak.

## Public Landing Legal Pages + Footer + Visual Balance Edge Cases

- Footer legal ve company info kolonlari dar desktop ve tablet araliklarinda tasmamalı; grid kirilimi kontrollu olmali.
- Story/support basliklarinda yesil vurgu okunurlugu dusurmemeli; body text beyaz/soft gri kalmali.
- Legal sayfalarda FI ve EN path'leri birbirinin locale alternates'i olmali.
- Kuluttajariitalautakunta/ADR bilgisi eklenirken kaldirilan ODR platformuna yonlendiren eski ifade kullanilmamali; 20 July 2025 sonrasi durum net yazilmali.

## Public Landing Legal Pages + Footer + Visual Balance Prompt

Sen bir Next.js public-site, visual polish ve GDPR/Finland web compliance uzmanisin.
Hedef: OmaLeima public landing sayfasindaki eksik desktop dikey fotograf alanini doldurmak, story/support alanlarinin renk dengesini iyilestirmek, tam-genislikte profesyonel bir footer kurmak ve Finlandiya odakli bilingual privacy + terms sayfalarini yayinlamaktir. Sonunda production deploy alinacak.
Mimari: mevcut App Router landing korunur; typed public content modeli footer linklerini de kapsayacak sekilde genisler; ortak legal content + ortak legal page renderer eklenir; yeni raster image repo public klasorune kopyalanir; CSS ile footer tam-genislikte band'a donusturulur.
Kapsam: public landing TSX/CSS/content/legal route'lari, yeni image asset, calisma dokumanlari, validation ve deploy. Admin/mobile/product logic degisiklikleri bu slice disinda.
Cikti: strict typed TSX/CSS/legal content degisiklikleri, FI+EN legal route'lari, yeni footer, yeni dikey gorsel, clean validation ve production deploy sonucu.
Yasaklar: `any` yok, gercekte olmayan analytics/cookie akisi uydurmak yok, ODR platformunu aktifmis gibi gostermek yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, minimal diff, readable bilingual legal copy, official-source-aligned wording, stable responsive layout, source-of-truth asset paths.

## Public Landing Legal Pages + Footer + Visual Balance Validation Plan

- `git --no-pager diff --check --` scoped public/legal files
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- local public-site visual smoke on desktop
- production deploy + live response checks

## Current Plan (Dynamic Security Regression + Native Smoke)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Local Supabase/Docker uzerinde full dynamic smoke setini yesile cekmek, native push diagnostics regression'ini current profile UX'e uygun kapatmak, iOS/Android smoke kapasitesini gercek arac durumuna gore kanitlamak.

## Dynamic Security Regression + Native Smoke Architectural Decisions

- Runtime smoke'larda false green uretilmeyecek; local DB schema drift varsa once current migration kontrati local DB'ye uygulanacak.
- Smoke script'leri product contract'a yaklastirilacak: scanner context payload'i event/eventVenue ile explicit olacak, device id policy yoksa smoke null device id kullanacak.
- Announcement push icin reward push smoke'unu kopyalamak yerine ayri role-bound smoke yazilacak; admin allow + student deny + push payload + persistence tek script'te dogrulanacak.
- `student/profile.tsx` icin frontend sahibinin layout degisiklikleri korunacak; yalnizca dev-only native diagnostics yuzeyi geri baglanacak.
- iOS icin mevcut `xcodebuildmcp` + Computer Use ile build/install/visual state alinacak. Android icin mevcut SDK/AVD kontrol edilecek; native Android project yoksa yeni prebuild uretmek bu smoke slice'ina dahil edilmeyecek.
- iOS dev-client icin tunnel yerine app scheme + LAN Metro URL source of truth kabul edilecek: `exp+omaleima-mobile` scheme'i ve `REACT_NATIVE_PACKAGER_HOSTNAME` ile cihaz/simulator tarafindan erisilebilir host.
- Business smoke icin hosted pilot scanner credential'i kullanilacak; credential degerleri dokumanlara yazilmayacak, sadece hangi hesap tipiyle smoke alindigi kaydedilecek.
- Android emulator boot proof'u alinacak fakat native Android project/APK yoksa uygulama smoke'u icin prebuild veya APK uretimi otomatik yapilmayacak. Bu karar dirty worktree'de buyuk generated diff riskini engeller.

## Dynamic Security Regression + Native Smoke Edge Cases

- Reward ve announcement push smoke'lari ayni mock Expo portunu kullanirsa paralel kosuda `EADDRINUSE` verebilir; sequential kosu product riskini degil test orchestration sinirini temsil eder.
- `scan_stamp_atomic` duplicate rejection status'u current business/event rule'a gore `ALREADY_STAMPED` veya replay guard'a gore `QR_ALREADY_USED_OR_REPLAYED` olabilir; iki durumda da tek stamp invariant'i korunuyorsa race smoke kabul edilebilir.
- Simulator dev client tunnel URL'i gecici dis ag bagimliligina takilabilir; local Metro URL'i de IPv4/IPv6 bind farki nedeniyle calismayabilir. Bu durumda install proof'u ile full flow smoke ayrimi acik raporlanacak.
- Physical device paired gorunse bile Developer Mode/trust, signing veya dev-client URL sorunu tam smoke'u bloklayabilir.
- iOS simulator camera preview siyah/virtual olabilir; smoke kabul kriteri permission prompt + camera frame ready state + scanner context UI'dir, gercek QR okutma degildir.
- Student Google PKCE smoke'u test credential'i olmadan tamamlanamaz. Google login baslatmak PKCE happy path'i kanitlamaz; tam kanit icin gercek ogrenci Google hesabi veya onayli test OAuth fixture gerekir.
- QR/scan/reward/announcement full-flow icin iki tarafli session gerekir: student QR ureten authenticated session ve scanner tarafinda kamera/scan session. Tek business session bu zincirin sadece scanner yarini kanitlar.

## Dynamic Security Regression + Native Smoke Prompt

Sen bir Supabase/Expo mobile release-readiness ve security regression uzmanisin.
Hedef: OmaLeima icin Docker + local Supabase stack uzerinde admin auth, RLS core, QR security, scan race, reward unlock push ve announcement push smoke'larini gercek Edge Function runtime'inda kosup yesile cekmek; mobile native push diagnostics regression'ini current profile UX'e uygun kapatmak; iOS/Android simulator/cihaz smoke icin elde edilebilen kaniti toplamak.
Mimari: mevcut smoke harness'leri current Edge Function/RPC kontratina hizalanir; local DB migration drift'i targeted olarak kapatilir; dev-only QA diagnostics surface mobile profile icine minimal diff ile geri baglanir; native tarafta xcodebuildmcp, Computer Use, simctl/devicectl ve Android SDK kontrolleri kullanilir.
Kapsam: smoke script'leri, `student/profile.tsx`, working docs ve validation. Public landing/admin redesign/mobile visual redesign gibi unrelated in-flight degisiklikler bu slice disinda.
Cikti: guncel smoke script'leri, yeni announcement push smoke komutu, green validation listesi, native smoke proof gap'leri ve sonraki adimlar.
Yasaklar: unrelated dirty worktree revert yok, smoke fail'ini gizlemek yok, stale audit'i product regression diye abartmak yok, native Android project'i bu slice'ta otomatik generate etmek yok.
Standartlar: AGENTS.md, zero-trust, strict typing, current scanner context contract, explicit errors, minimal diff.

## Dynamic Security Regression + Native Smoke Validation Plan

- `npm --prefix apps/admin run smoke:auth`
- `npm --prefix apps/admin run smoke:rls-core`
- `npm --prefix apps/admin run smoke:qr-security`
- `npm --prefix apps/admin run smoke:scan-race`
- `npm --prefix apps/admin run smoke:reward-unlocked-push`
- `npm --prefix apps/admin run smoke:announcement-push`
- `npx eslint scripts/smoke-qr-security.ts scripts/smoke-scan-race.ts scripts/smoke-reward-unlocked-push.ts scripts/smoke-rls-core.ts scripts/smoke-announcement-push.ts`
- `npm --prefix apps/mobile run audit:native-push-device-readiness`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `npm --prefix apps/mobile run audit:reward-notification-bridge`
- `npx eslint src/app/student/profile.tsx scripts/audit-native-push-device-readiness.mjs`
- `npm --prefix apps/mobile run typecheck`
- iOS simulator install/launch/screenshot attempt with `xcodebuildmcp`, `simctl`, and Computer Use
- Android SDK/AVD/device readiness check

## Current Plan (Public Landing Desktop Footer + Favicon + Unique Media Pass)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Public landing'de kalan son desktop polish sorunlarini kapatmak ve ardindan production deploy almak.

## Public Landing Desktop Footer + Favicon + Unique Media Architectural Decisions

- Landing IA ve copy korunacak; bu slice kalan desktop polish + asset hygiene isi.
- Footer yeni bir section haline getirilmeyecek; mevcut markup minimal degisiklikle okunakli grid/pill yapisina alinacak.
- Tekrar eden gorseller dosya ada gore degil gercek bitmap seviyesinde ayiklanacak; gerekirse local generated asset havuzundan yeni benzersiz sahne repo public klasorune kopyalanacak.
- Siyah/eksik gorunen alt section image'lari icin defensive olarak eager loading kullanilacak; landing cok gorsel odakli oldugu icin bu tradeoff kabul edilebilir.
- Favicon icin metadata'ya guvenmek yetmez; `apps/admin/src/app/favicon.ico` dogrudan marka logosuyla degistirilecek ve `icon.png` / `apple-icon.png` ile kaynaklar netlestirilecek.

## Public Landing Desktop Footer + Favicon + Unique Media Edge Cases

- Desktop'ta gorseller buyuk kalirken ayni kare ikinci kez baska section'da gorunmemeli.
- Footer legal item'lari kisa oldugu icin text link yerine pill/chip duzeni daha stabil; dar kolonlarda satir sonu tasmasi olmamali.
- Full-page screenshot ve hizli scroll durumlarinda da alt galeriler siyah placeholder gibi gorunmemeli.
- Favicon degisimi browser cache'i yuzunden gec algilanabilir; bu nedenle hem `.ico` hem `icon.png` hem `apple-icon.png` ayni branding ile servis edilmeli.

## Public Landing Desktop Footer + Favicon + Unique Media Prompt

Sen bir Next.js public landing polish ve responsive visual QA uzmanisin.
Hedef: OmaLeima public landing sayfasinda kalan desktop sorunlarini kapatmak: bos/siyah galeri slotu, bozuk footer yerlesimi, fazla buyuk tipografi, default favicon ve ayni gorselin tekrar kullanimi. Sonunda production deploy alinacak.
Mimari: mevcut App Router landing korunur; minimal TSX/CSS diff ile medya atamalari tekillestirilir, gerekli yeni asset repo public klasorune kopyalanir, footer grid/pill yapisina cekilir, `favicon.ico` gercek logo ile degistirilir.
Kapsam: public landing TSX/CSS/metadata/icon dosyalari, calisma dokumanlari, validation, visual smoke ve production deploy. Yeni backend, copy rewrite ve unrelated panel/mobile degisiklikleri bu slice disinda.
Cikti: strict typed TSX/CSS degisiklikleri, yeni/degisen icon assetleri, benzersiz public image seti, clean validation ve production deploy sonucu.
Yasaklar: `any` yok, ayni bitmap'i farkli dosya adi ile tekrar kullanmak yok, unrelated dirty worktree revert yok, sessiz placeholder fallback yok.
Standartlar: AGENTS.md, minimal diff, strict typing, readable desktop spacing, deterministic icon sources, production-ready verification.

## Public Landing Desktop Footer + Favicon + Unique Media Validation Plan

- `git --no-pager diff --check --` scoped public landing files
- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- desktop local screenshot smoke
- production deploy + `omaleima.fi` response check

## Current Plan (Security Regression + Device Smoke Attempt)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Kullanici tarafindan istenen security regression turunu kosmak; local stack veya cihaz sinirlari izin verdigi yerde runtime smoke almak; izin vermedigi yerde stale audit ile gercek regression'i ayirmak ve proof gap'i netlestirmek.

## Security Regression + Device Smoke Architectural Decisions

- Diger ajanin aktif frontend calismasina carpismamak icin urun koduna dokunmadan once mevcut smoke/audit ve MCP araclarindan maksimum kanit alinacak.
- Local Supabase stack kapaliysa seeded smoke script'lerini zorla yeniden kurgulamak yerine bunu acik blokaj olarak kaydetmek daha dogru. Yanlis "gecti" sinyali uretilmeyecek.
- Admin auth icin en guclu eldeki sinyal focused route guard smoke. Mobile auth icin en guclu sinyal PKCE/code-only callback kod izi.
- Eski audit script'leri mevcut mimariden geri kalmis olabilir; manual token fallback veya snapshot-only beklentisi gibi durumlarda audit fail'i otomatik regression sayilmayacak, ilgili kodun bugunku source-of-truth haliyle birlikte yorumlanacak.
- iOS device smoke icin `xcodebuildmcp` tercih edilecek; simulator build/run, boot ve launch proof'u alinmaya calisilacak. Android icin ayni seviyede MCP bulunmadiginda repo audit'leri ve mevcut run wiring'i ile yetinilecek.

## Security Regression + Device Smoke Edge Cases

- `smoke-auth` gibi script'ler `.env.local` ile local Supabase'a bakiyor; env hosted olsa bile seeded fixture beklentileri farkli olabilir, bu yuzden local stack yoklugu suppression kaniti degil.
- Native push diagnostics audit'i UI metinlerine ve butonlara baktigi icin, sadece kopya/stil degisikligi de audit'i kirmis olabilir; ama fiziksel push smoke oncesi yine de bilincli bir karar gerektirir.
- `build_run_sim` timeout verse bile arkada `xcodebuild` compile etmeye devam edebilir; timeout tek basina build fail'i degildir.
- Mevcut mobile typecheck baska ajanin aktif duzeltme alaninda oldugu icin bu tur typecheck blocker'ina mudahale edilmeyecek.

## Security Regression + Device Smoke Prompt

Sen bir mobile/web guvenlik regression ve release-readiness uzmanisin.
Hedef: OmaLeima icin admin auth, mobile auth, scanner context, RLS, reward/announcement push regression kontrollerini kosmak; ayrica mumkunse iOS/Android native smoke kapasitesinden somut kanit toplamak.
Mimari: mevcut smoke script'leri, focused code tracing, local stack readiness kontrolleri ve `xcodebuildmcp` simulator araci birlikte kullanilir. Runtime altyapi yoksa proof gap acikca yazilir.
Kapsam: validation komutlari, smoke denemeleri, stale audit ayiklama, calisma dokumani guncellemeleri ve handoff. Frontend refactor, yeni feature gelistirme ve diger ajanin aktif dosyalarina mudahale bu slice disinda.
Cikti: command-level validation sonucu, hangi regression'lar gecti/fail oldu/bloklandi ayrimi, feasible native smoke sonucu ve net sonraki adimlar.
Yasaklar: false positive'i runtime regression diye sunmak yok, false negative icin "gecti" demek yok, unrelated dirty worktree revert yok, baska ajanin in-flight degisikliklerine dalmak yok.
Standartlar: AGENTS.md, zero-trust, strict source-of-truth reading, minimal diff, explicit proof gaps, honest validation reporting.

## Security Regression + Device Smoke Validation Plan

- `npm --prefix apps/admin run smoke:auth`
- `npx tsx scripts/smoke-password-session-origin-guard.ts`
- `npm --prefix apps/mobile run audit:native-simulator-smoke`
- `npm --prefix apps/mobile run audit:native-push-device-readiness`
- `npm --prefix apps/mobile run audit:reward-notification-bridge`
- `npm --prefix apps/mobile run audit:hosted-business-scan-readiness`
- `npm --prefix apps/mobile run audit:realtime-readiness`
- local stack readiness checks (`docker ps`, `curl 127.0.0.1:54321/...`)
- `xcodebuildmcp` simulator discovery + build/run denemesi
- targeted ESLint on touched regression surfaces

## Current Plan (Repository Security Scan + Auth Session Hardening)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Complete a repository-wide security scan and land minimal fixes for the two surviving auth session findings: cross-site web password-session bootstrap and mobile deep-link OAuth session fixation.

## Repository Security Scan Architectural Decisions

- Keep the fixes at the session-establishing boundary instead of scattering checks across pages. The web route should reject cross-site requests before `supabase.auth.setSession()`.
- Prefer standards-based browser request provenance checks over app-level hidden state for the admin web route. This slice does not add a new custom CSRF framework.
- Move the mobile app from implicit OAuth to PKCE so the native callback only exchanges an authorization code that is bound to the locally stored verifier. Raw bearer tokens from a deep link will no longer be accepted.
- Reuse the existing mobile auth callback route and Supabase session storage instead of creating a second callback surface.
- Keep the diffs narrow and avoid touching unrelated product flows, RLS rules, or scanner/reward logic that already passed the first repository-wide discovery pass.

## Repository Security Scan Edge Cases

- The admin password-session route is only used by the first-party browser login panel, so rejecting requests without same-origin provenance is acceptable even if they come from generic API clients.
- Some browsers or non-browser clients may omit `Origin`; the route should still accept the intended same-origin panel flow via a same-origin `Referer` fallback, but reject mismatched origins.
- Mobile web must continue to work after enabling PKCE; the callback screen already exchanges `code`, so the client config and native helper need to agree on the same flow.
- Existing users with active sessions should not be logged out by the mobile auth flow change; only new OAuth bootstrap behavior changes.

## Repository Security Scan Prompt

Sen bir auth session guvenligi ve Supabase/Expo entegrasyon uzmanisin.
Hedef: OmaLeima repository-wide security scan sonucunda kalan iki reportable auth bulgusunu kapatmak: admin web password-session route'undaki cross-site session fixation/login CSRF yuzeyi ve mobile OAuth deep-link token kabulunden gelen session fixation yuzeyi.
Mimari: web route'ta session cookie yazilmadan once same-origin provenance guard uygulanir; mobile Supabase client PKCE flow'a gecirilir; native OAuth callback yalnizca authorization code exchange eder ve raw access/refresh token deep linklerini reddeder.
Kapsam: ilgili auth dosyalari, calisma dokumanlari, focused validation ve security report. RLS migration'lari, scanner/reward logic refactor'lari ve unrelated UI degisiklikleri bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, scan artifact reportlari, validation sonuclari ve handoff.
Yasaklar: `any` yok, sessiz fallback yok, raw bearer token deep link kabulune devam etmek yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, zero-trust, strict typing, minimal diff, explicit error handling, source-of-truth verification.

## Repository Security Scan Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/admin run build`
- targeted route smoke for web same-origin guard
- targeted static/runtime smoke for mobile PKCE callback path

## Current Plan (Public Landing Desktop Gallery Refresh + Navbar Behavior)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Keep the fixed/hamburger navbar work, but replace the too-small desktop image treatment with a fuller, cover-led gallery that uses better Desktop generated scene photos instead of logo-heavy app mockups.

## Public Landing Desktop Gallery Refresh + Navbar Architectural Decisions

- Keep the landing information architecture and copy intact. This slice is behavioral and framing-focused, not a redesign.
- Preserve the hero image and gallery as immersive cover surfaces instead of forcing contain-framing.
- Use stronger Desktop generated scene photos for gallery/support sections and remove the weakest logo/mockup-heavy app imagery from the public landing.
- Prefer better asset selection and per-surface crop control over shrinking every image to fit completely.
- Isolate navbar interaction in a dedicated typed client component instead of turning the full landing page into a client component.
- Use CSS state classes for the fixed/floating navbar and hamburger menu presentation. Avoid adding any animation library.

## Public Landing Desktop Gallery Refresh + Navbar Edge Cases

- Desktop image cards should feel large and photographic again, but key faces/phones/QR moments must not be cut awkwardly.
- Replaced assets must be copied into the repo's public workspace; the live landing should not depend on Desktop-only absolute paths.
- Mobile should keep its current acceptable image behavior and gain an open/close nav menu that can be dismissed with the same toggle button.
- The floating navbar must remain readable over dark imagery and not cause horizontal overflow on narrow screens.
- Anchor links should continue to work with the fixed navbar height.

## Public Landing Desktop Gallery Refresh + Navbar Prompt

Sen bir Next.js public landing page ve responsive media framing uzmanisin.
Hedef: OmaLeima public landing sayfasinda desktop gorselleri tekrar daha buyuk ve etkileyici gostermek, fakat kotu yarim crop'lari azaltmak; app-logo/mockup agirligini kaldirmak; Desktop generated assets klasorunden daha iyi event foto'lari secip siteye ve galeri alanina yerlestirmek; scroll sirasinda fixed navbar'i ve mobil hamburger menu davranisini korumaktir.
Mimari: mevcut App Router landing yapisi korunur; navbar interaction'i kucuk typed client component'te kalir; repo public klasorune secilen scene-photo assetleri kopyalanir; contain yerine cover-led medya kompozisyonu ve yuzey bazli object-position/ratio kararları kullanilir.
Kapsam: public landing media selection/layout/CSS degisiklikleri, mobile menu behavior'un korunmasi, validation ve handoff. Yeni backend, admin panel redesign ve kopya stratejisi bu slice disinda.
Cikti: strict typed TSX/CSS degisiklikleri, gerekli calisma dokumani guncellemeleri, validation ve deploy-ready sonuc.
Yasaklar: `any` yok, unrelated dosya revert yok, gereksiz library yok, mobilde mevcut iyi davranan medya akisini bozmak yok, Desktop absolute asset path'lerini dogrudan production source yapmak yok.
Standartlar: AGENTS.md, minimal diff, strict typing, accessible nav/button semantics, stable responsive sizing, stronger photo-led public presentation.

## Public Landing Desktop Gallery Refresh + Navbar Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- desktop and mobile browser smoke on the public landing
- scoped `git --no-pager diff --check -- ...`

## Current Plan (Business Media + Scanner Kiosk Audit)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Finish the next practical slice after the landing polish: prove the media/scanner root causes, remove the manual scanner fallback, and keep the scanner-only business flow tight.

## Business Media + Scanner Architectural Decisions

- Do not replace the existing storage upload helpers. They already enforce non-empty upload bodies and public-read verification before database rows are updated.
- Treat zero-byte hosted media as data hygiene. Client rendering should fallback safely, but the real fix is pruning stale hosted references/objects and using fresh verified uploads.
- Do not add join/leave powers to scanner accounts. Scanner-only staff should remain limited to scan/history routes.
- Remove manual token scanning from the kiosk UI. Staff should scan QR with camera only; long JWT paste is not a real event-day fallback.
- Native camera/location crashes are handled by fresh dev build reinstall because the native iOS project and Podfile already contain the required permissions/modules.

## Business Media + Scanner Edge Cases

- If a remote image URL is empty or zero-byte, it should never block the screen; the local fallback image remains visible.
- If there is one business event in a rail, it should remain centered; multiple events should stay horizontally scrollable.
- If multiple active events overlap, scanner event selection must remain available before reading QR.
- Scanner PIN flow must remain intact while removing only the manual pasted token flow.

## Business Media + Scanner Prompt

Sen bir Expo React Native scanner/media reliability uzmanisin.
Hedef: OmaLeima business/club media upload-render sikayetlerini kok neden seviyesinde ayirmak, scanner-only yetki sinirlarini dogrulamak, ve business scanner UI'dan kullanissiz manual token paste fallback'ini kaldirmak.
Mimari: mevcut Supabase Storage upload helper'lari, TanStack Query read-model'leri, Expo Router business route guard'i ve kamera tabanli scanner akisi korunur. Root-cause ayrimi: hosted data hygiene, old native build, veya client bug.
Kapsam: mobile scanner/media audit, scanner UI sadeleme, validation ve calisma notlari. Full duyuru/feed sistemi, yeni storage bucket tasarimi ve unrelated web redesign bu slice disinda.
Cikti: strict typed TSX degisiklikleri, docs update, mobile validation, handoff.
Yasaklar: scanner'a join/leave yetkisi verme, manual token fallback'i baska yere tasima, sessiz hata yutma, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md, minimal diff, strict typing, zero-trust role boundaries, no fallback unless it preserves safety without hiding root cause.

## Business Media + Scanner Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- scoped `git --no-pager diff --check -- ...`
- record remaining hosted/native smoke blockers in `PROGRESS.md`.

## Current Plan (App Store Screenshot Pack)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Deliver 5 iPhone and 5 iPad App Store screenshots in current accepted Apple portrait sizes, using OmaLeima's existing dark/lime visual identity and natural Finnish marketing copy.

## App Store Screenshot Pack Architectural Decisions

- Keep the source artwork generation in `image_gen`; do not fake screenshots with code-rendered UI at this step.
- Export one accepted portrait slot per family to cover the listing cleanly: iPhone `1320x2868`, iPad `2064x2752`.
- Store the final PNGs in the admin public workspace so they can be reused for the website, presentation decks, or store submission prep.
- Preserve a simple numbered naming scheme so the order is submission-ready.

## App Store Screenshot Pack Edge Cases

- Apple source guidance can change, so only the current checked sizes should be used for this export.
- Source images may not match the target aspect ratio exactly; resizing must preserve composition without letterboxing.
- Finnish headlines should stay short enough that no text is clipped after scaling.

## App Store Screenshot Pack Prompt

Sen bir App Store creative ve mobile product marketing tasarimcisisin.
Hedef: OmaLeima icin App Store'a yuklenebilecek 5 iPhone ve 5 iPad screenshot gorseli hazirlamak.
Mimari: once guncel Apple accepted screenshot size bilgisi dogrulanir, sonra `image_gen` ile uretilen OmaLeima tema gorselleri exact PNG export boyutlarina yeniden olceklenir ve workspace'e kaydedilir.
Kapsam: iPhone/iPad screenshot exportlari, dosya adlandirma, boyut dogrulamasi ve calisma notlari. Mobil app kodu, web landing, metadata ve store text bu slice disinda.
Cikti: `apps/admin/public/images/appstore-screenshots/iphone` ve `.../ipad` altinda export PNG'ler, validation ve handoff.
Yasaklar: LLM gibi ceviri copy yok, unrelated dosya revert yok, baska aspect-ratio icin bos padding yok.
Standartlar: AGENTS.md, koyu OmaLeima tema, lime vurgu, Fince kisa basliklar, exact pixel dimensions.

## App Store Screenshot Pack Validation Plan

- identify the latest generated PNG sources
- resize/export exact target dimensions
- verify output width/height with image metadata commands

## Current Plan (Hosted Scan RPC Signature Hotfix)

- **Date:** 2026-05-05
- **Branch:** `main` working tree.
- **Goal:** Scanner'da iki tarafta da dogru etkinlik seciliyken gelen `PGRST202` / `Could not find function public.scan_stamp_atomic(... p_event_venue_id ...)` hatasini canli Supabase DB fonksiyon imzasini Edge Function kontratiyla hizalayarak kapatmak.

## Hosted Scan RPC Hotfix Architectural Decisions

- Root fix database contract drift'idir; mobile scanner UI veya event selection state'i degistirilmeyecek.
- Yeni migration, local `20260504123000_scan_stamp_selected_event_venue_context.sql` icindeki 12 parametreli function body'yi idempotent hotfix olarak tekrar kuracak.
- Eski overload'lar (`10-param`, `11-param`) drop edilecek; PostgREST named RPC ambiguity ve stale direct-call riskleri azaltilacak.
- Function `security definer`, `set search_path = public, extensions`, pin/device validation, per-business stamp limit, leaderboard update, reward unlock ve registration completion davranisini koruyacak.
- Execute grant yalnizca `service_role`; `public`, `anon`, `authenticated` execute revoke edilecek.
- Migration sonunda `notify pgrst, 'reload schema'` ile schema cache yenilemesi tetiklenecek.

## Hosted Scan RPC Hotfix Edge Cases

- `p_event_venue_id` selected event/business ile eslesmezse `EVENT_CONTEXT_MISMATCH` donmeli; scan basmamali.
- Student QR event'i ile scanner selected event'i zaten Edge Function tarafinda kontrol ediliyor; DB function da event venue row'unu event/business/status ile tekrar dogrulayacak.
- Scanner device pin varsa pin zorunlulugu korunacak.
- Ayni QR replay'i `QR_ALREADY_USED_OR_REPLAYED` olarak kalacak.
- Per-business stamp limit doluysa `ALREADY_STAMPED` + `existingStampedAt` metadata'si korunacak.

## Hosted Scan RPC Hotfix Validation Plan

- Supabase MCP ile hosted `pg_proc` imzasini once/sonra sorgula.
- `mcp_com_supabase__apply_migration` ile DDL migration uygula.
- `notify pgrst, 'reload schema'` migration icinde calissin; gerekirse ayrica SQL ile tekrar tetikle.
- Hosted `pg_proc` sonucu tam 12 parametreli imzayi gostermeli.
- Local SQL diff-check ve gerekirse Supabase migration file syntax sanity.

## Hosted Scan RPC Hotfix Prompt

Sen bir Supabase PostgreSQL ve PostgREST RPC kontrat uzmanisin.
Hedef: `scan-qr` Edge Function'in gonderdigi selected `eventVenueId` aware 12 parametreli `scan_stamp_atomic` RPC imzasini hosted database ile hizalamak ve scanner 500/PGRST202 hatasini kapatmak.
Mimari: Atomik PostgreSQL RPC tek source of truth olarak kalir; Edge Function ayni kontrati kullanir; eski overload'lar temizlenir; PostgREST schema cache `NOTIFY pgrst, 'reload schema'` ile yenilenir.
Kapsam: Supabase migration, hosted migration apply, validation ve calisma notlari. Mobile UI, QR generation, admin web tasarimi ve unrelated dirty worktree bu slice disinda.
Cikti: Idempotent SQL migration, Supabase MCP apply sonucu, hosted signature validation, PROGRESS handoff.
Yasaklar: fallback RPC cagri yok, client-side bypass yok, `any` yok, sessiz hata yok, RLS/execute grant genisletmek yok, unrelated degisiklik revert yok.
Standartlar: AGENTS.md, zero-trust, atomic RPC, strict DB contract, service_role-only execute, PostgREST schema cache reload.

## Current Plan (Admin + Organizer Web Panel Design Overhaul — Phase 1)

- **Date:** 2026-05-05
- **Branch:** `main` working tree.
- **Goal:** Web admin/organizer panellerinin shell + dashboard home katmanini sade, actionable ve mobil kalitesinde organize hale getirmek. Renkler degil, yapi/duzen.

## Web Panel Design Phase 1 Architectural Decisions

- `DashboardShell` korunur ama `hero-banner` agir foto background yerine compact `PageHeader` (eyebrow + title + subtitle, opsiyonel `actions` slot) ile degistirilir. PageHeader ayri bir primitiv olarak ayni shell altinda yasayacak; ileride breadcrumb/aksiyon eklemek kolay.
- Sidebar nav item'larina inline SVG icon eklenir. Yeni `nav-icon.tsx` ufak bir tipli icon switch'i olur (`dashboard | oversight | applications | tags | events | announcements | claims | fraud | rewards | access`). External icon paketi eklenmez.
- `DashboardSectionsGrid` (statik bullet listesi) kaldirilmaz ama yeni sayfalar onun yerine `DashboardShortcutsGrid` kullanir. Her shortcut: icon, title, aciklama, optional `count` badge, `href`. Tiklanabilir kart `Link` ile rota acar.
- Shortcut listeleri yine `sections.ts` icinde declare edilir (`adminDashboardShortcuts`, `getClubDashboardShortcuts`). Count'lar server component icinde fetch edilir; hesap maliyetli olmamasi icin sadece zaten var olan read-model'lerden alinir (oversight snapshot, business-applications queue summary, club-claims/fraud/events snapshot summary'leri).
- `Access policy` nav/shortcut item'i kaldirilir; `/forbidden` end-user nav hedefi degil, system fallback.
- Responsive: `globals.css` altina `@media (max-width: 960px)` icin `shell` grid `1fr` olur; sidebar `position: static`, height auto, nav horizontal scroll/wrap olur. `content` padding kuculur. Sign-out butonu sidebar icinde altta kalmaya devam eder. Phase 1'de mobile drawer eklenmez (overkill); Phase 2'de gerekirse eklenir.

## Web Panel Design Phase 1 Edge Cases

- Shortcut count'lari fetch hata verirse home sayfa hala render olmali; count `null` ise badge gizlenir, icerik anlamli kalir.
- Club role'u `canManageRewards` `false` ise shortcut listesi mevcut sections.ts logic'i gibi reward/department-tags shortcut'larini gizlemeli.
- Sidebar dar viewport'ta active state hala net olmali; `nav-link-active` rengi yeterli, ek border gerekmez.
- `prefers-reduced-motion` users icin yeni hover/scale aksiyonlari motion-safe ile sinirlandirilir (yeni motion eklemiyoruz, mevcut transition korunuyor).

## Web Panel Design Phase 1 Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Scoped `git --no-pager diff --check` touched dosyalar uzerinde
- Optional manual: `https://admin.omaleima.fi/admin` ve `/club` home gorsel smoke (Phase 1 deploy sonrasi).

## Web Panel Design Phase 1 Prompt

Sen bir Next.js App Router + design-system uzmanisin.
Hedef: OmaLeima admin ve organizator panel sayfalarinin shell + dashboard home katmanini, mobil uygulama kalitesinde temiz, actionable ve tutarli hale getirmek.
Mimari: `apps/admin` mevcut `DashboardShell` korunur; `PageHeader`, `DashboardShortcutsGrid`, `NavIcon` adli yeni primitivler eklenir. Home sayfalarinin shortcut count'lari mevcut server-side read-model snapshot'larindan turetilir.
Kapsam: yalniz dashboard shell + `/admin` ve `/club` home pages + sidebar + globals.css responsive. Diger panel pages, formlar ve liste/pagination primitivleri Phase 2+'da ele alinacak.
Cikti: TypeScript React server/client component dosyalari, `globals.css` ek media query bloklari, REVIEW/PLAN/TODOS/PROGRESS guncellemeleri.
Yasaklar: yeni icon paketi yok, yeni state library yok, `any` yok, hero-banner foto background'unu home sayfasinda tasimak yok, shortcut count fetch hatasinin sayfayi devirmesi yok, mevcut renk palette'ini degistirmek yok.
Standartlar: AGENTS.md, Turkce yorum, strict typing, minimal diff, mevcut design token'lari kullan, accessibility (focus-visible, aria-current).

## Current Plan (Finnish Club Sales Presentation)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Produce a luxury Finnish-language OmaLeima presentation for pitching student clubs and organizers in live meetings.

## Current Plan (Partner Presentation V2)

- **Date:** 2026-05-06
- **Branch:** `feature/club-presentation-fi`
- **Goal:** Replace the first deck direction with a stronger photo-led Finnish partner presentation that works for both event organizers and participating businesses.

## Partner Presentation V2 Architectural Decisions

- Keep the first PPTX as a simpler club-only version, but create a stronger `omaleima-partner-presentation-fi.pptx` for actual outreach.
- Copy the relevant Desktop generated images into `docs/presentations/assets/partner-fi/` so the deck source assets are not only on the Desktop.
- Use the best visual assets as full-bleed slide backgrounds; use social-style images as smaller proof/context slides where appropriate.
- Reduce text density and keep Finnish direct: no fake metrics, no heavy SaaS language, no "LLM translated" phrasing.
- Split value proposition explicitly across organizers and businesses/venues.

## Partner Presentation V2 Prompt

Sen premium pitch deck tasarimcisisin ve Finceyi dogal, toplantida kullanilacak sekilde yaziyorsun.
Hedef: OmaLeima icin hem tapahtumajärjestäjille hem mukana oleville yrityksille/paikoille sunulacak lüks, fotoğraf ağırlıklı bir partner presentation hazirlamak.
Mimari: `pptxgenjs` ile 16:9 PPTX, Desktop'taki generated image assetleri workspace'e kopyalanir, metin PPTX text olarak kalir.
Kapsam: presentation dosyasi, presentation assetleri ve calisma notlari. App code, public site ve backend bu slice disinda.
Cikti: `docs/presentations/omaleima-partner-presentation-fi.pptx`, embedded image assetleri, validation ve handoff.
Yasaklar: generic LLM Fince yok, fazla corporate jargon yok, fake metric yok, bitmap icine zorunlu copy gommek yok, unrelated dirty worktree revert yok.
Standartlar: koyu OmaLeima tema, lime vurgu, appropassi/leima/haalarimerkki/rasti/eventtipaiva dili, isletme ve organizer faydasi net ayrilsin.

## Club Presentation Architectural Decisions

- Create a standalone `.pptx` under `docs/presentations/` so it can be opened in Keynote, PowerPoint, or Google Slides.
- Use existing local brand assets only: the generated OmaLeima logo and public black/lime editorial images.
- Keep copy Finnish-first, natural, and club/operator oriented rather than generic SaaS marketing.
- Use one idea per slide with large typography, dark backgrounds, lime accents, and no dense paragraphs.
- Include operational trust slides for QR validation, duplicate prevention, event overview, and reward handoff.

## Club Presentation Edge Cases

- Avoid promising features as already live unless the current product context supports them; phrase roadmap items as pilot/next-step where needed.
- Do not embed required copy into raster images; deck text remains editable PPTX text.
- Keep the deck useful even if the presenter speaks over it without notes.

## Club Presentation Prompt

Sen bir Fince bilen premium B2B/student-event pitch deck tasarimcisisin.
Hedef: OmaLeima'yi kulup ve ainejarjesto gorusmelerinde anlatmak icin lüks, koyu tema, Fince bir sunum hazirlamak.
Mimari: `pptxgenjs` ile standalone widescreen PPTX, mevcut logo ve public image assetleri, tek fikirli slide yapisi, buyuk okunabilir metin.
Kapsam: sunum dosyasi ve calisma notlari. Uygulama kodu, public site, database ve mobile flow bu slice disinda.
Cikti: `docs/presentations/omaleima-club-presentation-fi.pptx`, dogrulama ve handoff.
Yasaklar: LLM gibi generic copy yok, fazla metin yok, sahte metrik yok, bitmap icinde zorunlu metin yok, unrelated dirty worktree revert yok.
Standartlar: OmaLeima dark theme `#050705`, lime `#C8FF47`, Finnish student event culture terms, minimal diff.

## Club Presentation Validation Plan

- Generate the PPTX with bundled Node runtime and `pptxgenjs`.
- Inspect generated file existence and basic ZIP/PPTX structure.
- Optionally render/extract slide count if local tooling supports it.
- Run scoped `git --no-pager diff --check` for updated Markdown working docs.

## Current Plan (Public Landing v4 Overflow + Icons)

- **Date:** 2026-05-05
- **Branch:** `feature/app-logo-assets`
- **Goal:** Polish the live `omaleima.fi` landing after visual review: fix stat-card overflow, lower oversized type, remove the unwanted brand subtitle, add SVG icons to natural action/link locations, reuse the haalarit/student generated photos, and make menu anchors scroll smoothly.

## Public Landing v4 Architectural Decisions

- Keep the existing static Next.js public-site architecture and bilingual typed content.
- Fix the overflow root in content and CSS: use short metric values and constrain card typography instead of clipping or shrinking the whole page.
- Keep all meaningful text as HTML. Generated photos remain decorative/supporting assets and do not carry required copy.
- Add small inline SVG icon components inside the public landing renderer for contact/social actions. No new icon dependency is needed for this slice.
- Use CSS `scroll-behavior: smooth` and `scroll-margin-top` for public sections, with `prefers-reduced-motion` respected.
- Reuse existing generated photos by copying them into `apps/admin/public/images/public` and referencing them through `next/image`.

## Public Landing v4 Edge Cases

- Finnish words must not overflow stat cards at desktop, tablet, or mobile widths.
- The language switch remains available, but the brand block no longer shows a second language label under `OmaLeima`.
- SVG icons must be decorative where the adjacent text already names the action.
- Footer legal labels remain non-links until real legal pages exist.

## Public Landing v4 Prompt

Sen bir Next.js public landing page ve responsive typography uzmanisin.
Hedef: `omaleima.fi` landing page'inde Fince stat-card tasmasini duzeltmek, fazla buyuk text scale'i sakinlestirmek, brand altindaki dil ibaresini kaldirmak, contact/Instagram gibi action alanlarina SVG ikon eklemek, daha once uretilen haalaritli ogrenci ve scan fotograflarini kullanmak ve navbar anchor linklerini smooth scroll yapmaktir.
Mimari: mevcut App Router static public-site renderer, typed locale content, local `next/image` assets ve CSS-only responsive layout. Yeni dependency yok.
Kapsam: public-site content/renderer, global CSS public landing stilleri, iki local generated image asset ve calisma notlari. Admin dashboard, mobile app, Supabase ve legal page implementasyonu bu slice disinda.
Cikti: strict typed TSX/CSS, responsive overflow fix, SVG icons, updated imagery, validation ve handoff.
Yasaklar: metni bitmap icine gommek yok, public admin CTA yok, broken legal link yok, heavy animation library yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md minimal diff, strict typing, accessible links, smooth scroll with reduced-motion respect.

## Public Landing v4 Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- scoped `git --no-pager diff --check -- ...`
- desktop/mobile Playwright smoke for `/` and `/en`, checking no horizontal overflow and no stat-card clipping.

## Current Plan (Mobile Role Audit + Leaderboard Visibility + Notification Polish)

- **Date:** 2026-05-05
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Fix the real user-facing mobile logic gaps found during the cross-role audit: public leaderboard discovery, organizer home summary accuracy, and noisy/inconsistent student notification settings.

## Role Audit Architectural Decisions

- Keep the leaderboard fix in the mobile read model. The screen already consumes one overview query; the correct fix is to widen that overview query, not bolt on extra UI fetches.
- Keep student event discovery consistent with leaderboard visibility by merging public events with any non-public events the current student is still registered for.
- Preserve student-specific context in leaderboard ordering by keeping `registeredEventCount` and marking which public events are already registered. Registered events should stay easier to reach than unrelated public ones.
- Correct organizer summary math at the summary reducer only. Event cards and timeline grouping remain untouched.
- Keep push-permission/runtime helpers generic, but translate user-facing notification status inside `student/profile.tsx` so the UI never prints raw English helper strings.
- Hide the notification CTA after successful device registration, show a success affordance on the right, and keep a retry path only when registration still failed.
- Remove the profile QA row entirely instead of relying only on `__DEV__` gating. Keep the diagnostics provider intact so development tooling outside this row is not broken.
- Remove announcement impression counts from the shared card UI; they are not part of the student/business/club product language.

## Role Audit Edge Cases

- If there are no public leaderboard events at all, the leaderboard empty state must still explain the situation clearly.
- If push permission is already granted from a previous session, the profile screen should not keep showing a misleading enable CTA forever.
- If permission is granted but backend registration fails, the user still needs an explicit retry path.
- Organizer summary cards should ignore completed events, but the home rail can still show historical event cards where already intended.

## Role Audit Prompt

Sen bir Expo React Native mobile product logic ve read-model uzmanisin.
Hedef: student leaderboard sayfasinda public live leaderboard eventlerini kayit zorunluluguna takmadan gostermek, organizer home summary kartlarini tamamlanmis eventlerle sisirmemek, ve student profile bildirim ayarlarini Fince uyumlu, daha sakin ve basari durumu net bir yuzeye cevirmek.
Mimari: mevcut TanStack Query read modelleri, mevcut student profile settings card yapisi, mevcut push diagnostics/provider altyapisi ve mevcut announcement feed card component'i korunur. Root fix data owner dosyalarinda yapilir; yeni backend migration veya yeni dependency eklenmez.
Kapsam: mobile leaderboard read modeli, organizer dashboard summary reducer'i, student profile notification UX, shared announcement card metadata ve calisma notlari. Admin/web, scanner camera flow ve Supabase schema bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, minimal UI copy/localization duzeltmeleri, validation ve handoff.
Yasaklar: `any` yok, sessiz hata yok, unrelated dirty worktree revert yok, sadece yuzeysel UI yama yok.
Standartlar: AGENTS.md minimal diff, Turkish comments only if needed, strict typing, root-cause fix first.

## Role Audit Validation Plan

- `npm --prefix apps/mobile run typecheck`
- targeted `npx eslint --no-cache` on touched mobile files
- scoped `git --no-pager diff --check -- ...`
- focused `code-reviewer` on the touched mobile slice

## Current Plan (Public Landing v3 Navbar + Softer Hero)

- **Date:** 2026-05-05
- **Branch:** `feature/app-logo-assets`
- **Goal:** Make `omaleima.fi` feel like a real public website rather than a temporary splash: fix Finnish hero overflow, use more desktop width, add navbar/footer, and use fresh no-text brand imagery generated with `imagegen`.

## Public Landing v3 Architectural Decisions

- Keep `/` Finnish and `/en` English, sharing the same typed content and renderer.
- Keep all visible public copy in HTML, not inside generated images, so translations and responsive text sizing stay controlled.
- Add anchor navigation only (`#culture`, `#flow`, `#event-day`, `#contact`) so no broken legal/private routes are introduced.
- Add footer legal-prep labels as non-links until the actual legal/support pages exist.
- Use a wider max layout (`1540px`) and softer font scale so long Finnish phrases wrap cleanly without covering imagery.
- Keep the public site server-rendered/static; no new runtime dependency or client animation library.

## Public Landing v3 Edge Cases

- On mobile, the nav becomes a compact stacked header and the direct contact pill hides to avoid crowding.
- Legal footer labels must not be clickable until pages are implemented.
- Generated images with accidental text are not used for required content.
- Existing admin/auth routes remain separate and unlinked from the public landing CTA area.

## Public Landing v3 Prompt

Sen bir Next.js public landing page ve visual systems uzmanisin.
Hedef: `omaleima.fi` landing page'inde Fince yazi tasmasini duzeltmek, ekrani soldan/sagdan daha verimli kullanmak, gercek navbar/footer eklemek, ve `imagegen` ile uretilen OmaLeima uyumlu gorselleri HTML copy ile birlikte profesyonel bir public website iskeletine yerlestirmek.
Mimari: Next.js App Router static pages, ortak typed public content, ortak renderer, local `next/image` assets, CSS-only responsive layout. Public anchor nav kullanilir; admin/auth private route'lari public CTA olarak verilmez.
Kapsam: public-site content/renderer, global CSS public landing stilleri, local generated image assets ve calisma notlari. Legal sayfa implementasyonu, admin dashboard, mobile app ve Supabase auth bu slice disinda.
Cikti: strict typed TS/TSX/CSS, navbar/footer, softer responsive hero, no-text generated assets, validation ve handoff.
Yasaklar: kirik legal link yok, public admin CTA yok, metni bitmap icine gommek yok, agir JS animation yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md minimal diff, imagegen assetlerini workspace'e kopyala, SEO copy HTML'de kalsin, responsive text overlap olmasin.

## Public Landing v3 Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- scoped `git --no-pager diff --check -- ...`
- smoke local or deployed `/` and `/en` routes after build/deploy.

## Current Plan (Bilingual Public Landing v2 + Imagegen)

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets`
- **Goal:** Turn `omaleima.fi` into a more professional temporary landing page with Finnish-first and English route support, stronger product storytelling, and locally hosted generated visuals.

## Bilingual Landing Architectural Decisions

- Keep the public site fully static and route-based: `/` for Finnish and `/en` for English.
- Share one typed content model and one shared landing renderer rather than duplicating markup between pages.
- Keep admin/auth access separate; the public landing should expose only contact and social actions, not a direct admin CTA.
- Use the three generated PNG assets as hero/editorial section images served locally through `next/image`.
- Strengthen SEO with per-locale metadata and `alternates.languages`, but keep one canonical per route.
- Use CSS-only motion for reveals, floating highlights, and image presence so the page stays lightweight.

## Bilingual Landing Edge Cases

- The root layout `lang` stays Finnish-first; English content should still have English page metadata and a dedicated `/en` URL even if the root HTML tag remains global.
- Sitemap should continue to include the root page and can be expanded to include `/en`.
- The temporary landing must not imply that public self-serve organizer access is open if the current product process is still invite/contact based.

## Bilingual Landing Prompt

Sen bir Next.js landing page, SEO ve editorial product-site uzmanisin.
Hedef: `omaleima.fi` icin Fince odakli ama Ingilizce destekli, daha profesyonel, gorsel olarak guclu ve hizli bir landing page hazirlamak; mevcut direct admin CTA'yi kaldirmak; `imagegen` ile uretilen fotograflari lokal asset olarak kullanmak.
Mimari: App Router static pages (`/` ve `/en`), ortak typed content module, ortak landing renderer, local `next/image` assets, CSS-only animation. Admin/auth host'u ve private dashboard route'lari ayri kalir.
Kapsam: public pages, public-site componentleri, locale metadata, sitemap/robots gerekiyorsa genisletme, generated image asset entegrasyonu ve calisma notlari. Admin dashboard UX, Supabase auth, mobile app ve tam marketing redesign bu slice disinda.
Cikti: strict typed TS/TSX/CSS degisiklikleri, bilingual landing, generated asset usage, validation ve handoff.
Yasaklar: agir client animation library eklemek yok, public sitede admin giris CTA'si birakmak yok, auth boundaries'e dokunmak yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md minimal diff, fast static output, route-based language clarity, imagegen assets copied into workspace.

## Bilingual Landing Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- scoped `git --no-pager diff --check -- ...`
- smoke `https://omaleima.fi`, `https://omaleima.fi/en`, `https://omaleima.fi/robots.txt`, `https://omaleima.fi/sitemap.xml`

## Current Plan (Public Landing + Web Logo + SEO)

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets`
- **Goal:** Make the purchased `omaleima.fi` apex domain useful as a public entry point, reuse the real OmaLeima app icon on the web, and add a clean SEO baseline before the full landing redesign.

## Public Landing / SEO Architectural Decisions

- Keep `https://admin.omaleima.fi` as the auth/admin canonical host and Supabase Site URL.
- Use `https://omaleima.fi` as the public canonical host for root landing, Open Graph, sitemap, manifest, and organization metadata.
- Link public visitors to `https://admin.omaleima.fi/login` for admin/organizer access instead of exposing admin copy as the root experience.
- Reuse the generated mobile icon PNG as `apps/admin/public/images/omaleima-logo.png`; do not introduce a separate brand mark source.
- Add `robots.ts`, `sitemap.ts`, and `manifest.ts` through Next.js App Router metadata routes.
- Keep the root landing intentionally minimal: brand promise, short product positioning, contact email, Instagram, and admin panel link. Full visual redesign remains a later product slice.

## Public Landing / SEO Edge Cases

- If apex DNS still points at Zone.fi hosting, the code and Vercel aliases can be ready but `https://omaleima.fi` will not serve this app until the A record is changed.
- Search engines should index the public root only; `/login`, `/admin`, `/club`, `/auth`, and `/api` should be disallowed.
- Social previews should have stable absolute URLs and should not depend on a logged-in session.
- `www.omaleima.fi` should resolve to the same Vercel app once DNS and alias are ready.

## Public Landing / SEO Prompt

Sen bir Next.js SEO ve Vercel custom-domain uzmanisin.
Hedef: OmaLeima icin satin alinan `omaleima.fi` apex domainini public landing entry point olarak hazirlamak, web/admin yuzeylerinde mobile store logo asset'ini kullanmak ve SEO temelini eksiksiz kurmak.
Mimari: mevcut Next.js App Router admin app, public `apps/admin/public/images` assetleri, Next Metadata API, `robots.ts`, `sitemap.ts`, `manifest.ts`, Vercel aliases. Supabase Auth host'u `admin.omaleima.fi` olarak kalir.
Kapsam: admin web root page, metadata routes, visible brand logo usage, Vercel alias setup, calisma notlari. Full landing redesign, mobile app behavior, Supabase Auth Site URL degisikligi ve mail DNS kayitlari bu slice disinda.
Cikti: strict typed TS/TSX/CSS degisiklikleri, SEO metadata, public landing, manifest/robots/sitemap, validation ve kullaniciya net DNS talimati.
Yasaklar: auth host'u apex'e tasimak yok, mail MX/SPF/DKIM kayitlarini bozmak yok, admin/private route'lari indexletmek yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md minimal diff, explicit domain gates, no silent failures, Next.js metadata conventions.

## Public Landing / SEO Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- Scoped `git --no-pager diff --check -- ...`
- Vercel aliases for `omaleima.fi` and `www.omaleima.fi`.
- After DNS update: `curl -I https://omaleima.fi` and `curl -I https://www.omaleima.fi`.

## Current Plan (Business History Filters + Leaderboard Spotlight + Typography Audit)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Make business scan history structurally useful with filters and summary metrics, give `Sinun tilanteesi` a richer theme-safe gradient spotlight, and finish this wave with a concrete typography audit instead of guesses.

## History / Typography Architectural Decisions

- Keep the history enhancement mobile-only and client-side. The existing `stamps` query already returns enough fields to compute filters and stats, so no database change is needed.
- Increase the recent-history fetch window from the current tiny list to a moderate recent slice, then compute date sections, event chips, and stat cards in `business/history.tsx`.
- Reuse the existing chip/filter language already present in organizer mobile screens instead of inventing a second filtering UI pattern.
- Keep the history metrics explicit: show total valid stamps, pending manual review count, unique scanned students, and total rows inside the active filter context.
- Use `react-native-svg` for the leaderboard spotlight gradient because it is already present in the app stack through `react-native-svg`; do not add a new dependency.
- Treat typography cleanup as audit-first. Use `theme.typography` as the project source of truth and only patch visible local mismatches discovered during this slice instead of launching a repo-wide refactor.

## History / Typography Edge Cases

- If the history filter combination produces no rows, the empty state should explain that no scan matched the active filters rather than implying there is no history at all.
- Event filter chips should degrade cleanly when only one event exists in the history window.
- The current-user leaderboard spotlight must keep enough contrast in both dark and light theme modes.
- Scan rows marked `REVOKED` must remain visible but visually secondary compared with valid scan rows.

## History / Typography Prompt

Sen bir Expo React Native operator dashboard ve typography audit uzmanisin.
Hedef: business history ekranini sadece ham satir listesi olmaktan cikarip istatistikli, tarihe gore gruplanmis, etkinlik ve tarih filtreleri olan kullanisli bir history yuzeyine cevirmek; student leaderboard icindeki `Sinun tilanteesi` bolumune tema renkleri disina cikmadan gradient spotlight eklemek; ve projedeki text-size kullanimini audit ederek token yapisinin tutarli oldugunu dogrulamak.
Mimari: mevcut mobile Supabase `stamps` query sonucu, mevcut chip/filter dili, mevcut `theme.typography` tokenlari ve mevcut leaderboard entry card component'i. Yeni dependency, backend migration veya broad redesign yok.
Kapsam: mobile history query/screen, leaderboard spotlight ve calisma dokumanlari. Admin/web behavioral refactor, backend schema degisikligi ve unrelated mobile screens bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, history filters/stats UI, gradient spotlight, validation ve typography audit sonucu.
Yasaklar: tema renkleri disina cikan gradient yok, fake analytics yok, repo geneline buyuk typography refactor yok, unrelated files revert yok.
Standartlar: AGENTS.md minimal diff, strict typing, explicit operator states, mevcut token scale as source of truth.

## History / Typography Validation Plan

- `get_errors` on touched mobile/docs files.
- `npm --prefix apps/mobile run typecheck`
- targeted `npx eslint --no-cache` on touched mobile files.
- scoped `git --no-pager diff --check -- ...` for touched files.
- focused `code-reviewer` on business history + leaderboard slice.

## Current Plan (Custom Domain Cutover)

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets` dirty working tree; no code deploy should be bundled with the DNS cutover.
- **Goal:** Make `https://admin.omaleima.fi` the production admin URL only after Vercel DNS verification is ready, then switch Supabase Auth Site URL through the existing guarded script.

## Custom Domain Architectural Decisions

- Use `admin.omaleima.fi` for the admin/organizer web panel.
- Keep `omaleima.fi` reserved for the future public/marketing surface instead of pointing it at the admin app.
- Keep Zone.fi mail records (`MX`, `SPF`, `DKIM`, autoconfig/autodiscover) unchanged.
- Add only the missing `admin` DNS record at Zone.fi: `A admin.omaleima.fi 76.76.21.21`.
- After DNS propagation, run `audit:custom-domain-cutover`; only when it prints `custom-domain-cutover:READY`, run the Supabase Auth dry-run and then apply.
- Keep the preview Vercel callback URL in Supabase redirect allow-list during and after cutover for safe rollback/preview auth.
- Public contact identity for launch materials: `contact@omaleima.fi`, Instagram `@omaleima`.

## Custom Domain Prompt

Sen bir Vercel + Supabase Auth custom domain cutover uzmanisin.
Hedef: `omaleima.fi` domain satin alindiktan sonra admin web panelini `https://admin.omaleima.fi` uzerinden guvenli sekilde yayina almak ve Supabase Auth Site URL'ini yalnizca Vercel DNS dogrulamasi hazir oldugunda custom domaine cevirmek.
Mimari: mevcut `apps/admin` Vercel project link'i, mevcut `audit:custom-domain-cutover`, `audit:supabase-auth-url-config` ve `apply:supabase-auth-url-config` scriptleri. DNS Zone.fi tarafinda kalir; mail kayitlari korunur.
Kapsam: Vercel domain/alias kontrolu, Supabase hosted Auth audit/dry-run/apply, calisma notlari ve kullaniciya DNS talimati. Mobil feature, root landing site ve mail provider degisikligi bu slice disinda.
Cikti: CLI audit sonuclari, net DNS kaydi, Supabase apply icin gate durumu ve handoff.
Yasaklar: DNS hazir degilken Supabase Site URL apply yok, apex domaini admin paneline aceleyle tasimak yok, mail kayitlarini bozmak yok, unrelated dirty worktree revert yok.
Standartlar: AGENTS.md phased workflow, explicit gate checks, no silent failure, current Vercel/Supabase scripts as source of truth.

## Custom Domain Validation Plan

- `vercel whoami`
- `vercel domains inspect admin.omaleima.fi --scope senol-dogans-projects`
- `npm --prefix apps/admin run audit:supabase-auth-url-config`
- `npm --prefix apps/admin run audit:custom-domain-cutover`
- After Zone.fi DNS propagation: rerun custom-domain audit, then Supabase Auth dry-run, then apply.

## Current Plan (Scanner Sign-Out + Hosted Event Context Enforcement)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Add an icon-only sign-out affordance to the scanner screen and fix the hosted scan flow so a stamp is recorded only when scanner and student are on the same event.

## Scanner Enforcement Architectural Decisions

- Reuse the existing `club/home.tsx` sign-out interaction model inside `business/scanner.tsx` instead of introducing a new shared component in this slice.
- Keep the mobile scanner request contract unchanged because it already sends `eventId` and `eventVenueId`.
- Fix the critical behavior at the real root: redeploy the hosted `scan-qr` edge function with the local event-context validation logic. No new migration is needed because the remote RPC signature already supports `p_event_venue_id`.
- Preserve the deployed function's custom auth mode by keeping `verify_jwt: false` during deployment.

## Scanner Enforcement Edge Cases

- If scanner event context is missing, hosted behavior should continue to return `EVENT_CONTEXT_REQUIRED` instead of stamping.
- If the user signs out from scanner while the camera is open, the screen should behave like other role surfaces that already call `supabase.auth.signOut()`.
- The deploy must preserve existing duplicate-scan and reward-unlock push behavior.

## Scanner Enforcement Prompt

Sen bir Expo React Native event-day scanner UX ve Supabase Edge Function deployment uzmanisin.
Hedef: business scanner ekranina sag ustte icon-only sign-out aksiyonu eklemek ve hosted `scan-qr` function'ini secili scanner event + secili student QR event eslesmesini zorunlu tutacak guncel surume cikarmak.
Mimari: mevcut `business/scanner.tsx` event-day layout'u, mevcut mobile scan transport kontrati ve repo'daki guncel `supabase/functions/scan-qr` implementation'i. Yeni dependency ve yeni migration yok; root fix remote function deploy.
Kapsam: scanner mobile ekranı, Supabase edge function deploy'u ve handoff dokumanlari. Student QR redesign, business home/events surfaces ve unrelated admin/web dosyalari bu slice disinda.
Cikti: minimal TS/TSX degisikligi, hosted edge function deployment, validation ve handoff.
Yasaklar: sadece client-side warning ile yetinmek yok, event mismatch bug'ini hosted function'i guncellemeden kapatilmis saymak yok, unrelated files revert yok.
Standartlar: AGENTS.md minimal diff, strict typing, explicit mismatch errors, zero-trust event validation.

## Scanner Enforcement Validation Plan

- `get_errors` on touched mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint` or targeted no-cache eslint when wider cache is misleading.
- Scoped `git --no-pager diff --check -- ...` for touched mobile/docs files.
- Verify hosted `scan-qr` content after deploy with Supabase MCP.

## Current Plan (Tag Modal + Community Card Cleanup)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Keep the student department-tag creator visible while the keyboard is open, simplify duplicated affordances in community announcement cards, and upgrade student club cards with larger sizing plus a contact/info sheet.

## Community Card Architectural Decisions

- Keep the student profile department-tag modal in `student/profile.tsx`; add a focused scroll-to-input behavior on custom-tag input focus instead of replacing the modal with a new screen or dependency.
- Leave `AnnouncementFeedSection` as the single owner of announcement card UX. Remove only the decorative source bell and the redundant read action state when an item is already read; preserve the actual push-preference toggle and unread acknowledge button.
- Extend `public-club-directory.ts` with `contactEmail` because `clubs.contact_email` already exists and is used elsewhere in mobile club management.
- Keep the public club section in the same student community screen, but scale the cards up and add an overlay info button that opens a local modal sheet with full club identity plus contact actions.
- For direct contact, use `Linking.openURL` with `mailto:` for the existing club email field. Do not invent a phone action because club schema currently has no public phone column.

## Community Card Edge Cases

- If a club has no contact email, the info sheet should still show the club name and meta without a broken action button.
- If the user has already read an announcement and there is no CTA URL, the action row can disappear entirely instead of rendering a second disabled `Read` label.
- The larger club rail cards must still fit narrow iPhones; use screen-width-based sizing rather than a fixed oversized width.
- The keyboard fix should continue to work when there are zero selected tags and only the create form is visible.

## Community Card Prompt

Sen bir Expo React Native mobile form ve card UX uzmanisin.
Hedef: student profile `Ainejärjestötagit` modal'inda custom-tag input'u keyboard acikken gorunur tutmak, community announcement kartlarindaki duplicate bildirim ve `Luettu/Read` yuzeylerini sadeleştirmek, ve public student club kartlarini daha buyuk hale getirip info/contact modal'i eklemek.
Mimari: mevcut student profile modal'i, mevcut `AnnouncementFeedSection`, mevcut public club directory query/section, ve native `Linking`. Yeni dependency, backend migration veya route ekleme yok.
Kapsam: ilgili mobile TS/TSX dosyalari ve handoff dokumanlari. Announcement backend semantics, club management permissions, business/organizer flows ve unrelated user degisiklikleri bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, mevcut Finnish/English kopyayi koruyan UI, keyboard-safe input focus davranisi, sade announcement karti ve info modal'li club cards.
Yasaklar: decorative duplicate ikonlari birakmak yok, read durumda ikinci `Luettu` yuzeyi birakmak yok, olmayan phone verisini uydurmak yok, unrelated files revert yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile tasarim dili, strict typing, acik hata davranisi.

## Community Card Validation Plan

- `get_errors` on touched mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Scoped `git --no-pager diff --check -- ...` for touched files and handoff docs.
- Focused `code-reviewer` on the touched mobile slice.

## Current Plan (OmaQR Profile Overlay + Scanner-Only Navigation)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Polish the OmaQR/profile and business event card spacing, then make scanner-only business accounts see only the scanner and scan history surfaces.

## Scanner-Only Architectural Decisions

- Extend the existing `SessionAccess` read model with `isBusinessScannerOnly` instead of duplicating business membership queries in the tab layout.
- For scanner-only business users, return `/business/scanner` as `homeHref` so login/root redirects no longer pause on business home with `Avataan kameraa...`.
- In `business/_layout.tsx`, hide `home`, `events`, and `profile` tabs with `href: null` when `isBusinessScannerOnly` is true; keep `scanner`, `history`, and hidden detail/update routes available.
- Add explicit redirects inside business layout for scanner-only deep links to `home/events/profile`, sending them back to scanner while allowing history.
- Keep business owner/manager behavior unchanged; they still get the full tab bar and event/profile management surfaces.
- Move `StudentProfileHeaderAction` into the OmaQR hero container as an absolute overlay so it does not alter hero image vertical layout.
- Add action-row horizontal padding/gap for business joined event scanner/history/leave controls rather than widening cards or changing data logic.

## Scanner-Only Edge Cases

- A scanner-only user with no active event still lands on scanner; the scanner screen already owns no-active-event states and history remains reachable.
- If a user has mixed business memberships, including at least one owner/manager role, they are not treated as scanner-only.
- A hidden tab route can still be deep-linked; the layout-level redirect should handle that without breaking hidden announcement detail routes.
- The overlay profile CTA must not cover the hero badge/counter row or make swiping impossible.

## Scanner-Only Prompt

Sen bir Expo React Native mobile role-navigation ve event-day UX uzmanisin.
Hedef: student OmaQR profil butonunu event gorselinin ustune overlay olarak almak, business event kartlarindaki `Poistu tapahtumasta` ve `Historia` aksiyonlarina yatay bosluk vermek, scanner-only business hesaplarinda home'daki `Avataan kameraa...` bekleme yuzeyini kaldirmak ve bu hesaplara yalnizca `Skanneri` ile `Historia` tablarini gostermek.
Mimari: mevcut Expo Router tabs, mevcut `SessionAccess` query, business home overview role bilgisi, mevcut scanner/history ekranlari ve student OmaQR hero rail. Yeni dependency veya backend migration yok.
Kapsam: mobile auth access model, business tab layout, business home/history/events polish, student active-event hero ve calisma dokumanlari. Supabase scan RPC/Edge Function, owner/manager event management ve unrelated admin/web dosyalari bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, Finnish/English UI labels korunarak, scanner-only flag, hidden tabs, redirect davranisi, validation ve handoff.
Yasaklar: scanner-only icin profile/events/home tablarini gorunur birakmak yok, owner/manager navigation'i daraltmak yok, camera loading'i home'da tekrar gostermek yok, profile CTA'nin hero'yu asagi itmesi yok, unrelated user changes revert yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile tasarim dili, explicit redirect behavior, strict typing.

## Scanner-Only Validation Plan

- `get_errors` on touched mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm run qa:mobile-hosted-business-scan-readiness`
- Scoped `git --no-pager diff --check -- ...` for touched mobile/docs files.
- Focused `code-reviewer` on this mobile UX/navigation slice.

## App Logo Assets Plan

- **Date:** 2026-05-04
- **Branch:** `feature/app-logo-assets`
- **Goal:** Add the generated OmaLeima logo as the actual mobile app icon and export Apple/Android store-ready sizes using the app's dark theme and lime brand color.

## App Logo Architectural Decisions

- Use the generated square RGB logo as the single source image so iOS, Android, splash, favicon, and store exports stay visually consistent.
- Point Expo `icon` and `ios.icon` at the same 1024x1024 RGB PNG instead of the placeholder Expo icon composer directory.
- Keep Android adaptive icon simple: lime logo foreground with dark theme background color `#050705`.
- Store explicit Apple and Android upload/reference sizes under `apps/mobile/assets/store-icons/` without introducing a new build dependency.

## App Logo Edge Cases

- Store listing icons must not contain alpha; generated icon exports are RGB PNGs.
- Native launcher icon changes do not show up in an already-installed app until a rebuild/reinstall.
- Existing unrelated worktree changes remain outside this slice.

## App Logo Prompt

Sen bir Expo React Native release asset uzmanısın.
Hedef: generated OmaLeima logo'yu iOS, Android, splash ve store teslim boyutları için gerçek uygulama asset'i haline getirmek.
Mimari: mevcut Expo `app.config.ts` icon/adaptiveIcon/splash/favicon alanları ve workspace altındaki PNG assetleri. Yeni dependency yok.
Kapsam: sadece mobile app config ve logo PNG assetleri; navigation, auth, backend veya admin davranışına dokunma.
Çıktı: RGB PNG store/export assetleri, Expo config path güncellemesi ve doğrulama çıktısı.
Yasaklar: alpha'lı App Store icon üretmek yok, placeholder Expo icon'a bağlı kalmak yok, unrelated kullanıcı değişikliklerini revert etmek yok.
Standartlar: AGENTS.md minimal diff, mevcut koyu tema `#050705` ve lime logo görsel dili.

## App Logo Validation Plan

- Verify generated icon dimensions and alpha state with `sips`.
- Run mobile config typecheck.
- Run scoped `git --no-pager diff --check` for touched text files.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Add student-style bottom tab navigation to business and organizer mobile areas, move student/business announcements to clearer home-screen slider surfaces, center and summarize the leima pass better, and fix mobile organizer announcement datetime + upload issues.

## Architectural Decisions

- Reuse the student tab visual language (`Tabs`, `GlassTabBarBackground`, `SymbolView`) for `business` and `club` so role areas feel consistent and orientation improves without inventing a second navigation pattern.
- Keep `updates` as a hidden full-feed route, but move the entry point to home screens and render home announcements as an auto-advancing rail instead of a stacked card list.
- Keep announcement data ownership inside `AnnouncementFeedSection`; extend it with a `rail` presentation rather than duplicating fetch/mutation logic in separate home widgets.
- Move leima stats out of the lower leima-face-only block into a shared top progress bar used by both QR and pass faces, and center the slot grid in `StudentLeimaPassCard`.
- Reuse the existing calendar/time editor pattern from `club/events` inside `club/announcements` for `startsAt` and `endsAt` instead of introducing a new picker dependency.
- Fix the announcement upload RLS issue at the root by correcting the malformed UUID regex in storage policy logic and applying the migration remotely with Supabase MCP.

## Edge Cases

- Scanner-only business users should still land in the scanner flow automatically, but tabs must remain available so they can recover orientation afterward.
- The rail presentation must still degrade cleanly when only one announcement exists or when no image is attached.
- If organizer announcement `endsAt` is intentionally empty, the calendar editor must preserve that optional behavior.
- The storage policy fix must allow `clubs/{clubId}/announcements/...` paths specifically and continue to reject invalid or cross-club writes.
- User-local files remain outside this agent's scope: `AGENTS.md`, `apps/mobile/package.json`, `RAPOR.md`, and `apps/mobile/src/app/student/events/.idea/`.

## Prompt

Sen bir Expo React Native navigation/UX ve Supabase storage policy uzmanısın.
Hedef: business ve club mobile alanlarını student benzeri alt menüyle netleştirmek, student/business announcements yüzeylerini home-first slider deneyimine taşımak, leima pass progress bilgisini daha doğru konumlandırmak ve mobile club announcement formundaki tarih + upload akışını kullanılabilir hale getirmek.
Mimari: mevcut Expo Router alan layout'ları + mevcut announcement query/mutation katmanı + mevcut club event datetime editor pattern + Supabase storage migration. Yeni dependency yok, broad redesign yok.
Kapsam: ilgili mobile layout/screen/component dosyaları, announcement feed presentation, leima pass card, club announcement form ve Supabase migration/distant apply. Web announcement routes yalnızca kullanıcı değişikliği olarak okunur; unrelated admin edits'e dokunulmaz.
Çıktı: TypeScript/TSX ve SQL migration değişiklikleri, sıkı tiplerle, `any` kullanmadan; mobile doğrulama ve Supabase migration sonucu ile birlikte.
Yasaklar: role navigation'ı tekrar stack-only bırakmak yok, announcement data logic'ini kopyalayarak ikinci fetch surface üretmek yok, upload RLS hatasını client-side fallback ile gizlemek yok, unrelated user değişikliklerini revert etmek yok.
Standartlar: AGENTS.md §5 güvenlik kuralları, mevcut mobile görsel dili, minimal diff, açık hata mesajları.

## Validation Plan

- `get_errors` on touched mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Code review subagent on touched mobile navigation/announcement/pass files.
- Scoped `git --no-pager diff --check` on changed files.
- Supabase MCP migration apply for the announcement-media policy fix.
- Update `PROGRESS.md` with remaining physical smoke needs for tabs, rail announcements, pass layout, and club announcement upload.

## Current Plan (Organizer Home Cleanup + Student Club Discovery)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Simplify organizer home for creators and give students a lightweight view of all currently active clubs plus the total active club count.

## Profile CTA Architectural Decisions

- Keep organizer bottom tabs intact; remove only the redundant quick-action row and home announcement rail from `club/home.tsx` so creation/management flows stay reachable from tabs.
- Move organizer sign-out to the home header and remove the duplicate profile sign-out surface instead of introducing a new settings route.
- Add a dedicated `public-club-directory` query hook under `apps/mobile/src/features/club/` so student discovery stays typed and reusable instead of inlining Supabase fetch logic inside the screen.
- Read only `ACTIVE` clubs and expose name, city, university, logo, and cover identity fields; do not surface club-member aggregates in this slice.
- Fix follow-up quality gaps in the touched surfaces immediately if validation/review exposes them, rather than leaving raw join status codes or invalid email saves behind.

## Profile CTA Edge Cases

- Organizer users must still reach announcements/events/profile through tabs after the home quick actions are removed.
- If no active clubs exist, the student discovery card must render a calm empty state instead of a blank rail.
- If the club directory query fails, the student screen must show retry affordance without affecting the event list query.
- Contact email remains optional; empty string is valid, malformed non-empty input is not.
- Join-event failures that come back as auth/profile/event status codes must map to localized user-facing notices instead of raw backend codes.

## Profile CTA Prompt

Sen bir Expo React Native mobile UX uzmanisin.
Hedef: organizer home'u gereksiz tiedotteet/takvim quick actions ve home announcement yuzeyinden temizlemek, cikis aksiyonunu ust saga tasimak ve student events ana ekranina aktif kulup dizini eklemek.
Mimari: mevcut Expo Router role screens, mevcut club tab shell, yeni ama kucuk bir React Query public club hook'u ve mevcut student events discovery yuzeyi. Yeni dependency ve backend migration yok.
Kapsam: `club/home`, `club/profile`, `student/events`, yeni `public-club-directory` query ve ilgili handoff dosyalari. Organizer bottom tabs, announcement authoring flow'u ve club member aggregate exposure bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, localized hata mesajlari, optional email validation, mobile validation komutlari ve guncel handoff.
Yasaklar: unrelated redesign yok, service-role fallback yok, raw status code UX'i yok, invalid email'i sessizce kaydetmek yok, kullanicinin diger degisikliklerini revert etmek yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile tasarim dili, acik hata mesajlari, mevcut public clubs RLS politikasina sadakat.

## Profile CTA Validation Plan

- `get_errors` on `club/home.tsx`, `club/profile.tsx`, `student/events/index.tsx`, and `public-club-directory.ts`.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check -- ...` for touched mobile files and working docs.
- `code-reviewer` on the touched mobile files; resolve any actionable finding before handoff.

## Current Plan (Card Consistency + Community + Event Freshness)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Make mobile card rails visually consistent, move student tiedotteet + clubs to a dedicated bottom-tab community page, prevent ended events from appearing in upcoming/edit lists, and make event screens refreshable when organizers publish new events.

## Form Isolation Architectural Decisions

- Extend `AppScreen` with an optional `refreshControl` prop so screens can pull-to-refresh without duplicating root scroll containers.
- Use the existing `/student/updates` route as the visible community tab; keep `/student/profile` hidden and reachable through top-right profile buttons.
- Extract active club UI to `PublicClubDirectorySection` so the student events screen and community screen do not duplicate Supabase query/render logic.
- Keep student event discovery focused on event discovery; remove the announcements and clubs sections from that page after community tab is visible.
- Keep completed business joined events only in the explicit past section; keep organizer completed/cancelled events out of `Tulossa` and edit-list selectors, while showing ended organizer events as a separate read-only ended area.
- Add a small overlap utility for active/upcoming event windows and show non-blocking warnings in student, business, and organizer event surfaces.
- Normalize card heights locally where rails render variable content: announcement rail items, business home/business event rails, organizer home rails, organizer event chips, and active club cards.

## Current Edge Cases

- Empty club directory still needs a friendly localized empty state.
- Pull-to-refresh should work even when one query errors; refetch calls should be explicit and query-scoped.
- Same-day simultaneous events should not be blocked, because QR tokens and scan RPCs are event-specific; users only need clear event selection guidance.
- Completed events with `ACTIVE/PUBLISHED` status but past `end_at` must be treated as ended in UI.
- Student tab count should stay usable after adding community; hiding profile from tabs avoids a crowded bottom menu.

## Current Prompt

Sen bir Expo React Native mobile bilgi mimarisi ve event-day UX uzmanisin.
Hedef: tum role slider kartlarini sabit/uyumlu boyuta getirmek, student tiedotteet + clubs yuzeylerini ayri community tab'inda toplamak, profil erisimini ust sag aksiyon yapmak, ended eventlerin upcoming/edit listelerine karismasini engellemek, event listelerine pull-to-refresh eklemek ve ayni anda iki event oldugunda kullaniciyi dogru QR/event secimine yonlendirmek.
Mimari: mevcut Expo Router tabs, mevcut React Query read modelleri, `AppScreen` root scroll refresh prop'u, public club query component'i ve pure overlap helper. Yeni backend migration yok.
Kapsam: mobile student/business/club event/community surfaces ve shared card/feed UI. QR token/RPC semantics, event creation business rules ve admin web bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, Finnish/English labels, no Turkish UI words, pull-to-refresh, fixed card dimensions, overlap warning copy, validation results and handoff.
Yasaklar: completed events'i upcoming diye gostermek yok, raw Turkish labels yok, service-role fallback yok, unrelated files revert yok, simultaneous events'i haksiz yere engellemek yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile design language, explicit errors, RLS-safe public reads, strict typing.

## Current Validation Plan

- `get_errors` on touched mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Scoped `git --no-pager diff --check -- ...` for touched mobile/docs files.
- `code-reviewer` on this slice; fix actionable findings before final handoff.

## Current Plan (Profile CTA + Form Isolation)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Make student profile access more explicit and reduce organizer event-page clutter by isolating create/edit forms from list/history content.

## Current Architectural Decisions

- Replace repeated icon-only student profile header buttons with one shared localized component so the discoverability fix stays consistent across all student surfaces.
- Keep student routing unchanged; only the header CTA presentation changes.
- Treat `club/events.tsx` as a pure create/edit form route. Existing event browsing and edit entry stay in the already existing organizer home and `club/upcoming` surfaces.
- Keep ended classification logic untouched because `deriveTimelineState` already separates `LIVE`, `UPCOMING`, and `COMPLETED` correctly; only the screen composition changes.

## Form Isolation Edge Cases

- Narrow student headers must still fit the CTA without forcing titles into unreadable wrapping.
- If there are no creatable memberships, the organizer screen should not show an empty create form; it should explain that creation is unavailable for that role.
- If a routed `eventId` is present, the screen must still open directly into the isolated edit form.
- Routed edit links for ended or cancelled events should fail clearly instead of silently dropping the user into a noisy mixed screen.

## Form Isolation Prompt

Sen bir Expo React Native mobile information architecture uzmanisin.
Hedef: student tarafinda profile aksiyonunu text+icon ile daha anlasilir yapmak ve organizer event create/edit ekraninda formu liste/history karmasasindan ayirmak.
Mimari: mevcut Expo Router screen'leri, yeni kucuk bir shared student header action component'i ve `club/events.tsx` icinde saf create/edit form route mantigi. Event browse/edit entry mevcut `club/home` ve `club/upcoming` uzerinden kalacak. Backend veya query modeli degismeyecek.
Kapsam: ilgili student header surface'leri, `club/events.tsx`, calisma dokumanlari ve handoff. Supabase schema, event timeline derivation ve other role navigation bu slice disinda.
Cikti: strict typed TS/TSX degisiklikleri, lokalize button labels, form-yalin organizer event route'u, validation ve handoff.
Yasaklar: raw icon-only CTA'yi birakmak yok, create/edit form etrafinda ayni sayfada history/list gostermek yok, ended eventleri backend seviyesinde yeniden yorumlamak yok, unrelated user degisikliklerini revert etmek yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile design language, acik kullanici metni, strict typing.

## Form Isolation Validation Plan

- `get_errors` on touched student and organizer mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Scoped `git --no-pager diff --check -- ...` for touched files.
- `code-reviewer` focused on the touched mobile files.

## Current Plan (Rail Height + Multi Event QR/Scanner + Live Filters)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Fix role-wide slider empty scroll space, make simultaneous active events clear on student QR and business scanner screens, keep the OmaQR profile CTA visually above the hero, make QR/leima card tap-to-flip natural, and restore organizer `Käynnissä` filter correctness.

## Rail + Multi Event Architectural Decisions

- Fix slider empty space in `AutoAdvancingRail` by measuring item heights and applying the active item height to the horizontal rail viewport, instead of patching every caller separately.
- Keep auto-advance, snapping, and indicators unchanged; only the vertical layout behavior changes.
- Add a typed QR candidate helper that returns all active/upcoming registered events, then let `student/active-event.tsx` own selected event state so users can switch between concurrent event QR tokens.
- Keep QR token generation event-specific; do not alter Supabase QR/RPC semantics because simultaneous events are valid.
- Move the business scanner event selector above the scanner kiosk and make the selected event visually obvious before camera use.
- Align club timeline derivation with business runtime rules: `PUBLISHED` or `ACTIVE` events inside `start_at..end_at` are live.

## Rail + Multi Event Edge Cases

- If the selected student QR event expires or disappears after refetch, select the first still-valid active event, then upcoming event.
- If there is only one QR/scanner event, avoid adding extra visual noise.
- If a rail item height has not been measured yet, allow natural layout until measurement exists.
- If organizer event status is `DRAFT`, it must remain draft even if its date range overlaps now.
- If scanner is locked/submitting, event selector presses stay disabled to avoid switching context mid-scan.

## Rail + Multi Event Prompt

Sen bir Expo React Native event-day UX ve typed read-model uzmanisin.
Hedef: tum role slider kartlarinda kisa kartlardan sonra olusan bos scroll alanini shared rail seviyesinde kaldirmak, student OmaQR ekraninda ayni anda aktif/tulossa kayitli eventleri secilebilir yapmak, business scanner'da event secimini kamera oncesinde belirginlestirmek, OmaQR profil CTA'sini hero'nun ustunde tutmak, QR/leima kartlarini kart tiklamasiyla cevirmek ve organizer `Käynnissä` filtresini runtime event durumuna gore duzeltmek.
Mimari: mevcut Expo Router screen'leri, `AutoAdvancingRail` shared component'i, typed `student-qr` helper fonksiyonlari, mevcut business home overview ve club dashboard read modelleri. Supabase schema/RPC degisikligi yok.
Kapsam: ilgili mobile shared rail, student QR, business scanner, club dashboard read model ve calisma dokumanlari. QR token formatina, scan RPC'ye, admin web'e veya unrelated event form logic'ine dokunma.
Cikti: strict typed TS/TSX degisiklikleri, Finnish/English labels, adaptive rail height, event selector UI, validation ve handoff.
Yasaklar: ayni anda eventleri engellemek yok, client-side fallback ile QR semantics degistirmek yok, `any` tipi yok, unrelated user degisikliklerini revert etmek yok, bos scroll'u tek tek padding hackleriyle saklamak yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile tasarim dili, explicit error behavior, strict typing, Finnish/English-only UI copy.

## Rail + Multi Event Validation Plan

- `get_errors` on touched mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`

## Current Plan (Swipe QR + Scanner Guard + Announcement Detail)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Make event-day selection swipe-driven and safe: student QR switches by swiping the hero, business scanner switches by swiping the scanner event card, wrong-event QR scans are rejected by the Edge Function, tiedotteet cards open detail pages, and redundant tab-page back buttons are removed.

## Swipe QR Architectural Decisions

- Use horizontal snapping `ScrollView` rails for student QR hero and business scanner event context so event selection is tactile, visible, and compact without adding new dependencies.
- Keep selected event state as the source for QR generation and scanner device registration; swipe changes only the selected ID/venue ID.
- Extend scan request types with `eventId` and `eventVenueId`, then require those fields in `scan-qr` and enforce `eventId === verifiedQrToken.payload.eventId` before stamp creation.
- Add a Supabase migration that passes `eventVenueId` into `scan_stamp_atomic`; the RPC remains the source of stamp creation and now validates the selected event venue atomically before inserting the stamp.
- Add a shared `AnnouncementDetailScreen` and role-specific hidden routes so student/business/club feeds can open full tiedotteet details without duplicating UI.
- Add an ID-specific announcement detail query so detail routes are not limited by the 15-item feed query.
- Remove manual left-back controls only from bottom-tab root screens; keep back controls on detail-only pages.

## Swipe QR Edge Cases

- If the selected scanner event is locked/submitting or the selector is moving, swipe/tap changes and camera scans should be disabled until the scan context settles.
- If a student has only one QR event candidate, show the hero normally and avoid instruction clutter.
- If an announcement disappears or is not readable under RLS, the detail screen should show a clear unavailable state and retry action.
- Older scan clients without `eventId`/`eventVenueId` now receive `EVENT_CONTEXT_REQUIRED`; the current mobile scanner and admin smoke callers always send context.
- A QR for another event at the same business must return a mismatch-style scan result, not `SUCCESS` or `ALREADY_STAMPED`.

## Swipe QR Prompt

Sen bir Expo React Native event-day UX ve Supabase Edge Function güvenlik uzmanısın.
Hedef: student OmaQR ve business scanner event seçimini swipe tabanlı, estetik ve anlaşılır hale getirmek; business scanner'ın seçili event dışında bir event QR'ını kabul etmesini backend seviyesinde engellemek; tiedotteet kartlarını detay sayfasına açmak; alt menü root sayfalarından gereksiz sol üst geri butonlarını kaldırmak.
Mimari: mevcut Expo Router tabs + hidden detail routes, existing React Query read models, scanner transport types, `scan-qr` Edge Function, atomic `scan_stamp_atomic` RPC ve migration. Yeni dependency yok.
Kapsam: mobile student QR, business scanner/events/history/profile/updates, club tab root screens, announcement feed/detail/query component, scanner transport/type files, `scan-qr` function, Supabase migration, scan smoke scripts and working docs. Admin web redesign veya unrelated media/profile değişiklikleri yok.
Çıktı: strict typed TS/TSX, Edge Function TypeScript ve SQL migration değişiklikleri, Finnish/English UI copy, event-context mismatch/required statuses, validation and handoff.
Yasaklar: client-only QR mismatch guard yok, selected event dışındaki QR'ı success saymak yok, tab root geri butonlarını bırakmak yok, tiedotteet kartlarını sadece CTA ile sınırlamak yok, `any` yok, unrelated kullanıcı değişikliklerini revert etmek yok.
Standartlar: AGENTS.md §5 güvenlik/RLS prensipleri, mevcut mobile tasarım dili, açık hata mesajları, atomic RPC korunumu, minimal focused diff.

## Swipe QR Validation Plan

- `get_errors` on touched mobile/function files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Supabase function validation/deploy path for `scan-qr` if tooling is available.
- Scoped `git --no-pager diff --check -- ...` for touched files only.
- `code-reviewer`, `security-reviewer`, `database-reviewer`, and focused architecture review subagents on the QR/scanner/announcement slice.
- Scoped `git --no-pager diff --check -- ...` for touched mobile/docs files.
- `code-reviewer` on the touched mobile files; resolve actionable findings before handoff.

## Current Plan (Scanner Reprovision After Revoke)

- **Date:** 2026-05-06
- **Branch:** `bug/scanner-reprovision-after-revoke`
- **Goal:** Prevent stale revoked scanner installation ids from forcing active business users back to login, require revoked scanner accounts to provision again, and show device model metadata in business scanner device management.

## Scanner Reprovision Architectural Decisions

- Keep the security decision in Supabase RPCs: revoked/foreign installation rows still return `DEVICE_REVOKED` and unauthorized actors still return `ACTOR_NOT_ALLOWED`.
- Handle stale local device identity in the mobile scanner helper by deleting the stored installation id and retrying registration once after `DEVICE_REVOKED`.
- Collect a compact, optional model label from `expo-device` and send it through both scanner page registration and owner QR provisioning.
- Store the model as nullable `business_scanner_devices.device_model` and include it in active device queries.
- Keep revoked devices hidden from the business profile list; only active devices remain visible.
- Preserve older mobile bundles by giving direct scanner registration `p_device_model` a `default null`; newer bundles can send model metadata without forcing immediate native/JS rollout.

## Scanner Reprovision Edge Cases

- If a revoked anonymous scanner auth session still exists locally, retrying with a new installation id must still fail because the actor no longer has active business staff access.
- If an owner/manager reuses the same phone after revoking a scanner device, the retry can create a new active scanner device without a login loop.
- If the model name is unavailable, the UI falls back to the existing platform label.
- Older Edge Function clients that do not send `deviceModel` should still provision successfully with `null`.
- Older direct scanner registration clients that do not send `p_device_model` should still reach the same authorization checks and register/update behavior.

## Scanner Reprovision Prompt

Sen bir Supabase + Expo scanner provisioning guvenlik uzmanisin.
Hedef: revoked scanner cihazlarin eski installation id ile login/scan dongusune sokmasini engelle, aktif isletme kullanicisinin ayni telefonu temiz cihaz olarak yeniden kaydedebilmesini sagla ve skannerilaitteet listesinde cihaz modelini goster.
Mimari: Supabase RPC source of truth korunacak, Expo SecureStore/localStorage scanner installation id resetlenecek, register flow tek kez retry edecek, owner QR provisioning ayni device metadata payload'unu kullanacak.
Kapsam: scanner device helper, business scanner login helper, provision edge function, scanner devices profile list, nullable DB migration ve calisma dokumanlari. Scanner stamp RPC, unrelated admin copy ve pricing yok.
Cikti: strict typed TypeScript/SQL, nullable `device_model`, overloadsiz RPC migration, model-aware device list, validation commands.
Yasaklar: revoked scanner-only hesaba owner QR olmadan tekrar yetki vermek yok, RLS/authorization guard zayiflatmak yok, catch-all silent fallback yok, unrelated dirty dosyalari revert etmek yok.
Standartlar: AGENTS.md, explicit errors, minimal diff, strict typing, Supabase atomic RPC semantics.

## Scanner Reprovision Validation Plan

- `npm --prefix apps/mobile run typecheck`.
- Scoped ESLint for touched mobile TypeScript/TSX files.
- `supabase db lint` or local migration validation when the local Supabase stack is reachable.
- Scoped `git --no-pager diff --check` for touched files.

## Current Plan (Scanner Density + Refresh Spinner + Swipe Clamp)

- **Date:** 2026-05-04
- **Branch:** `main` working tree, no branch created by this agent.
- **Goal:** Make the business QR scanner more usable on real iPhone height, prevent non-manual route-change loading spinners, make the announcement notification toggle quieter but functional, and ensure one OmaQR swipe moves to at most one adjacent event.

## Scanner Density Architectural Decisions

- Keep the scanner screen in the existing `AppScreen` and `InfoCard` shell, but reduce vertical density: the title/meta, selector help copy, manual token help copy, and bottom status text are reduced or removed while the selected event context remains visible.
- Size scanner event cards from the content width (`windowWidth - horizontal screen padding`) and use a fixed snap stride so a selected card fits inside the rail on narrow devices.
- Keep camera readiness and selected event status as compact pills above the camera rather than long prose under it.
- Use local `isRefreshing` state for pull-to-refresh surfaces so only user-initiated refreshes show the native spinner; background query refetches update silently.
- Move announcement push preference to an icon-only header button with accessibility labels, while preserving the existing mutation path and disabled pending state.
- Clamp OmaQR hero momentum target to `selectedEventIndex - 1`, `selectedEventIndex`, or `selectedEventIndex + 1` based on swipe direction and keep tap selection unchanged.

## Scanner Density Edge Cases

- If scanner has one active event, no extra event selector header should appear; the camera should remain high.
- If scanner is locked/submitting, event cards and manual token fallback stay disabled.
- If a manual refresh fails, query error cards still show the existing retry affordance.
- If an announcement is platform-wide or club-specific, the icon preference control must still pass the same `clubId`, `sourceType`, and inverted `pushEnabled` payload as before.
- If the user flings the OmaQR hero quickly across several pages, the selected event changes only one step; the follow-up scroll effect snaps the rail back to that selected neighbor.

## Scanner Density Prompt

Sen bir Expo React Native real-device UX uzmanisin.
Hedef: business QR scanner ekranini iPhone'da daha yukariya almak, gereksiz metinleri kaldirip secili event kartini alana tam sigdirmak, sayfa gecislerinde background refetch yuzunden gorunen loading spinner'i gizlemek, announcement `Ilmoitukset paalla` aksiyonunu daha sakin ve calisir bir yere tasimak ve student OmaQR swipe'inda tek kaydirmayla maksimum bir event ilerletmek.
Mimari: mevcut mobile screen'ler, `AppScreen` refreshControl pattern'i, existing React Query refetch calls, existing announcement preference mutation, existing student/business horizontal `ScrollView` rails. Yeni dependency yok.
Kapsam: business scanner layout, student OmaQR swipe handler, announcement feed card action placement, pull-to-refresh kullanan student/business/club event surfaces ve calisma dokumanlari. Supabase schema/RPC ve unrelated profile/admin dosyalari yok.
Cikti: strict typed TS/TSX degisiklikleri, Finnish/English UI/accessibility labels, manual refresh state, compact scanner card styles, validation ve handoff.
Yasaklar: scanner context guard'i zayiflatmak yok, manual token fallback'i kaldirmak yok, refresh'i tamamen bozmak yok, notification preference mutation'ini sadece gorsel hale getirmek yok, bir swipe'ta birden fazla QR event atlamak yok, unrelated user changes revert yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile tasarim dili, explicit error behavior, strict typing.

## Scanner Density Validation Plan

- `get_errors` on touched mobile files.
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm run qa:mobile-hosted-business-scan-readiness`
- Scoped `git --no-pager diff --check -- ...` for touched mobile/docs files.
- `code-reviewer` focused on this mobile UX slice.

## Current Plan (Mobile Tab/Profile UI Regression Polish)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree, no branch created by this agent.
- **Goal:** Remove visible mobile UI regressions found during device smoke: `?` tab icons, floating tab gap, clipped scanner logout, profile debug diagnostics, and missing user full name.

## Mobile Tab/Profile Architectural Decisions

- Keep the shared `TabIcon` component unchanged and fix callers by using MaterialIcons glyph names that exist in the installed icon map.
- Keep the existing custom bottom tab visual language, but set the tab bar bottom offset to `0` so the surface sits flush with the safe-area/home-indicator design.
- Make the scanner top-bar text shrink before the sign-out button, preserving the button as a fixed-width action.
- Remove the student profile diagnostics card from visible UI while keeping the native push diagnostics hook available for permission/register state.
- Prefer Supabase Auth/Google metadata display name for the profile hero, then fall back to profile table display name, then email.

## Mobile Tab/Profile Edge Cases

- If Google metadata is missing or empty, the profile still shows database display name, email, or localized student fallback.
- If the scanner title is long, the sign-out button remains visible instead of being pushed off-screen.
- If push permission is unavailable, the normal notifications row still communicates permission state without dev diagnostics controls.
- If a role layout uses default tab icons, the fallback icon must also exist in MaterialIcons.

## Mobile Tab/Profile Prompt

Sen bir Expo React Native real-device UI regression uzmanisin.
Hedef: device smoke sirasinda gorulen mobil UI regresyonlarini temizlemek: tab ikonlarindaki soru isaretleri, alt tab bar boslugu, scanner logout kirpilmasi, student profile debug diagnostics gorunumu ve ad-soyad yerine bolum adinin baslikta gorunmesi.
Mimari: mevcut Expo Router tab layout'lari, shared `TabIcon`, business scanner top bar styles ve student profile screen. Backend, auth flow, scanner RPC ve push registration semantics degismeyecek.
Kapsam: student/business/club tab layout icon names, bottom tab offsets, scanner top bar flex styles, student profile visible profile/diagnostics surface ve calisma dokumanlari. Yeni dependency yok.
Cikti: strict typed TS/TSX degisiklikleri, glyph-map-backed MaterialIcons names, visible profile name fallback, validation screenshots ve handoff.
Yasaklar: push hook'unu tamamen sokmek yok, scanner/manual-token flow'u degistirmek yok, unrelated dirty worktree degisikliklerini revert etmek yok, fallback olarak var olmayan icon name kullanmak yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile tasarim dili, strict typing, device-smoke proof.

## Mobile Tab/Profile Validation Plan

- Validate touched MaterialIcons names against `@expo/vector-icons` glyph map.
- `npm --prefix apps/mobile run typecheck`.
- Scoped ESLint on touched mobile files.
- iOS simulator visual smoke for student profile and tab icons.
- Android emulator visual smoke for student tab icons and tab bar spacing.
- Scoped `git --no-pager diff --check -- ...` for touched mobile/docs files.

## Current Plan (Student Navigation + QR Density + Leaderboard Simplification)

- **Date:** 2026-05-05
- **Branch:** `feature/club-presentation-fi` working tree, no branch created by this agent.
- **Goal:** Make the student mobile UI feel less crowded on device: shorten the bottom community tab, lift the My QR card by removing the bulky pre-QR stats row, and strip extra leaderboard explanatory copy.

## Student Density Architectural Decisions

- Keep the student updates route and page heading unchanged; only the bottom-tab title becomes short enough for five-tab mobile navigation.
- Keep My QR stamp/tier data visible but move it from two full cards before the QR into compact metadata in the QR footer.
- Keep leaderboard event selection, status badges, error/loading/empty handling, standings list, and current-user spotlight; remove only the repeated description/meta text.
- Avoid new components or data queries; this is a presentation-only density pass.

## Student Density Edge Cases

- If reward progress is still loading, the compact QR metadata uses the same safe `0` fallback as the previous stat cards.
- If no leaderboard event is selected, existing empty/error/loading cards still explain the state.
- If the user relies on the Community screen heading, it remains full text inside the screen even though the tab label is shortened.

## Student Density Prompt

Sen bir Expo React Native mobile density ve information hierarchy uzmanisin.
Hedef: student bottom tab label overflow'u azaltmak, My QR ekraninda QR'i daha yukariya almak ve leaderboard ekranindaki fazla aciklama metinlerini kaldirarak liste/secilen event odagini guclendirmek.
Mimari: mevcut Expo Router student tab layout'u, `student/active-event.tsx` QR scene footer'i ve `student/leaderboard.tsx` presentational copy. Backend, query, scanner, reward semantics degismeyecek.
Kapsam: student tab label, active-event QR progress metadata, leaderboard visible prose ve calisma dokumanlari. Yeni dependency yok.
Cikti: strict typed TS/TSX minimal diff, daha kisa tab copy, compact QR footer meta, sade leaderboard, type/lint/visual smoke.
Yasaklar: route adlarini degistirmek yok, stamp/tier bilgisini tamamen kaldirmak yok, leaderboard state handling'i silmek yok, unrelated dirty worktree degisikliklerini revert etmek yok.
Standartlar: AGENTS.md minimal diff, mevcut mobile tasarim dili, strict typing, real-device readability.

## Student Density Validation Plan

- `npm --prefix apps/mobile run typecheck`.
- Scoped ESLint on touched student files.
- iOS/Android simulator screenshot smoke for student tabs and My QR density where available.
- Scoped `git --no-pager diff --check -- ...` for touched mobile/docs files.
## Current Plan (Admin Mobile Support Inbox + Replies)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Let admins review and answer support requests sent from student, business, and organizer mobile areas, with replies visible in the sender's mobile support history.

## Admin Support Architectural Decisions

- Keep `public.support_requests` as the source of truth for both incoming messages and admin replies because mobile already reads `admin_reply`.
- Add a single privileged RPC for replies so status changes, resolved timestamps, and audit logging happen atomically under a locked request row.
- Keep the admin UI behind the existing dashboard access resolver and call a route handler instead of mutating support rows directly from the browser.
- Read inbox rows through the existing server component Supabase client and compose sender/business/club names in a typed read model.
- Add `support_requests` to realtime and invalidate the mobile support history query when rows for the current user/area change.

## Admin Support Edge Cases

- Empty or too-short replies are rejected before reaching the database, and the RPC also validates trimmed reply length.
- `RESOLVED` and `CLOSED` replies set `resolved_at`; reopening to `OPEN` or `IN_PROGRESS` clears `resolved_at`.
- Missing deleted business or club records are shown as unavailable targets instead of throwing.
- Suspended admins cannot reply because both the route access resolver and the RPC require an active platform admin profile.
- A sender with the support history modal open sees the answer after realtime invalidates and refetches the current area query.

## Admin Support Prompt

Sen bir Supabase + Next.js admin operasyonlari uzmanisin.
Hedef: mobil uygulamadaki student, business ve organizer destek taleplerini admin panelinde listelemek, adminin cevap yazmasini saglamak ve cevabi gonderenin mobil destek gecmisinde gorunur hale getirmek.
Mimari: `support_requests` source of truth, server-side admin route handler, service-role atomic RPC, audit log, typed admin read model, mobile React Query realtime invalidation. Yeni dependency yok.
Kapsam: support reply SQL migration, admin support inbox page/read-model/component/API/nav/i18n/CSS, mobile support sheet realtime refresh ve calisma dokumanlari. Public contact/apply formlari, user status ve department-tag akislari tekrar refactor edilmeyecek.
Cikti: strict typed TS/TSX, SQL migration, Finnish/English copy, admin reply UX, validation/deploy/handoff.
Yasaklar: browser'dan service-role kullanmak yok, client-only authorization yok, bos cevap kabul etmek yok, mevcut kullanici degisikliklerini revert etmek yok, `any` yok.
Standartlar: AGENTS.md §5 RLS/security, explicit errors, atomic DB mutation, minimal focused diff, existing dashboard visual language.

## Admin Support Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- Apply hosted Supabase migration and verify RPC grants/realtime publication.
- Production smoke: unauthenticated admin support page redirect and reply API 403.
- Scoped `git --no-pager diff --check` for touched files.

## Current Plan (Cookie Consent + Public SEO)

- **Date:** 2026-05-06
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Add web cookie preference consent, add mobile privacy/app-data acceptance before login, and improve public SEO/AI search clarity for OmaLeima.

## Cookie/SEO Architectural Decisions

- Add a client-side web cookie preference component in the public/admin root layout so every web page can show the same consent layer.
- Store web preference in a versioned first-party cookie with `SameSite=Lax`, `Secure`, and a long max age; essential cookies stay enabled and analytics/marketing remain off unless a future script checks the explicit preference.
- Add a footer/settings trigger so users can reopen cookie settings and change choices after the initial banner.
- Keep mobile consent native-app specific: persist a versioned acknowledgement in `expo-secure-store`, show legal links beside the acknowledgement, and disable student/business/scanner sign-in actions until accepted.
- Improve SEO through truthful metadata, canonical alternates, sitemap freshness, robots AI crawler access, SoftwareApplication/Service/FAQ JSON-LD, and extractable landing-page FAQ copy.
- Update privacy copy to describe essential cookies/local storage and current optional-cookie status in both Finnish and English.

## Cookie/SEO Edge Cases

- If JavaScript is disabled, the site still renders content and legal links; the cookie banner simply cannot persist a preference.
- If a user previously accepted an older consent version, the new version can ask again without deleting essential auth/session cookies.
- If mobile SecureStore read fails, login remains gated and the error is visible rather than silently bypassing consent.
- If the user switches mobile language before accepting, the acknowledgement text updates without losing the pending state.
- Admin/club authenticated pages inherit the same web consent component, but auth/session cookies remain treated as strictly necessary.

## Cookie/SEO Prompt

Sen bir privacy-aware Next.js + Expo React Native + SEO uzmanisin.
Hedef: OmaLeima web ve mobil tarafinda kullanicinin cerez/app-data kullanimini profesyonel sekilde kabul etmesini saglamak, tercihleri versiyonlu saklamak, privacy/terms baglantilarini net gostermek ve public web SEO/AI search sinyallerini guclendirmek.
Mimari: Next.js root layout client consent banner, first-party versioned cookie, footer settings trigger, Expo SecureStore consent acknowledgement, mevcut legal link componentleri, mevcut public metadata/sitemap/robots/JSON-LD altyapisi. Yeni dependency yok.
Kapsam: public/admin web consent UI/CSS/legal/metadata/structured data/sitemap/robots, mobile login consent gate and related components/docs. Supabase schema, auth semantics, scanner/event reward logic ve unrelated dirty files yok.
Cikti: strict typed TS/TSX, locale-aware FI/EN copy, accessible controls, truthful structured data, validation and deploy/handoff.
Yasaklar: optional tracking script eklemek yok, optional consent'i pre-selected yapmak yok, auth/session cookies'i bozmak yok, native app storage'i browser cookie gibi yanlis anlatmak yok, store availability veya unsupported ozellikleri SEO'da overclaim etmek yok, `any` yok.
Standartlar: AGENTS.md, Traficom cookie guidance, GDPR/ePrivacy consent principles, existing visual language, explicit errors, minimal focused diff.

## Cookie/SEO Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/admin run build`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- Production deploy and smoke `/`, `/en`, `/privacy`, `/login`, `/sitemap.xml`, `/robots.txt`.

## Current Plan (Organizer + Business Finnish Sales Decks)

- **Date:** 2026-05-07
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Produce two separate, meeting-ready Finnish puhekieli OmaLeima decks: one for organizers and one for businesses/venues.

## Organizer + Business Sales Deck Architectural Decisions

- Use the Presentations plugin artifact-tool workflow for editable PPTX export, previews, layout JSON, manifests, and contact sheets.
- Create two separate final files under `docs/presentations/` instead of combining organizer and business messaging into one deck.
- Use `consumer-retail` as the primary deck profile because the pitch is image-led and client-facing; apply product-platform and GTM gates secondarily for workflow clarity and buyer logic.
- Use existing project-generated OmaLeima images and the existing logo only; do not generate new identity assets or fake partner/business marks.
- Keep Finnish copy short, spoken, and presenter-friendly: appropassi, leima, rasti, haalarimerkki, scan, palkinto, tapahtumapäivä.
- Avoid fake quantitative claims. Use qualitative proof objects: event flow, operational pain, scan workflow, repeatable participation, and pilot steps.
- Keep temporary Presentations workspace files outside final deliverables and clean them after PPTX validation.

## Organizer + Business Sales Deck Prompt

Sen olet premium presentation designer, Finnish student event culture copywriter ja OmaLeima product strategist.
Hedef: Kaksi erillistä pitch deckiä: järjestäjille oma deck appropassin, rastien, leimojen ja palkintojen hallintaan; yrityksille oma deck scanner-flow'n, tapahtumanäkyvyyden ja tilausarvon selittämiseen.
Mimari: Presentations artifact-tool JSX, editable PPTX text, project-provided/generated image assets, dark OmaLeima theme, no fake metrics.
Kapsam: presentation deliverables, selected asset usage, working docs and validation. App code, Supabase schema, mobile/admin runtime behavior and unrelated dirty files are outside scope.
Cikti: `docs/presentations/omaleima-organizer-presentation-fi.pptx` and `docs/presentations/omaleima-business-presentation-fi.pptx`.
Yasaklar: LLM-sounding Finnish, generic SaaS copy, fake logos, fake metrics, required text embedded in raster images, unrelated refactors, global dependency installs.
Standartlar: AGENTS.md, Presentations skill, imagegen skill asset rules, Finnish puhekieli, brand-authentic project imagery, minimal focused output.

## Organizer + Business Sales Deck Validation Plan

- Build both decks with `build_artifact_deck.mjs`.
- Generate preview PNGs, layout JSON, manifests, and contact sheets during validation.
- Visually inspect both contact sheets for readability, rhythm, and brand coherence.
- Verify PPTX zip structure contains the expected slide XML files: 12 organizer slides and 11 business slides.
- Run scoped `git --no-pager diff --check` for the presentation deliverables and working notes.
# Current Plan (Release Candidate Bug Fix Slice)

- **Date:** 2026-05-08
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Fix the reported admin organization account, announcement update, and student Approt profile navigation regressions while keeping release preparation moving.

## Architectural Decisions

- Re-publish `admin_create_club_owner_account_atomic` with a new idempotent Supabase migration and `pgrst` schema reload notification so hosted PostgREST can discover the RPC.
- Keep website, Instagram, logo URL and banner URL optional in manual account forms; only owner identity and required business/organization location fields remain required.
- Treat event-scoped announcements as immutable in audience semantics: if `eventId` exists, submit/update as `STUDENTS` and do not let the select drift to `ALL`, `BUSINESSES`, or `CLUBS`.
- Make student profile header navigation push a unique profile route URL so repeated taps from Approt still open the hidden profile screen after returning.

## Prompt

Sen release-candidate full-stack bug fix engineer olarak calisiyorsun.
Hedef: Admin organizer account RPC not-found hatasini hosted Supabase icin idempotent migration + schema reload ile kapat; event-scoped announcement update audience drift bug'ini UI ve submit payload seviyesinde engelle; student Approt profile button navigation no-op regresyonunu duzelt; optional URL/media fields'in required olmadigini dogrula.
Mimari: Supabase security-definer RPC migration + focused Next.js form normalization + Expo Router profile navigation patch + validation commands.
Kapsam: admin organization account creation, announcements panel update flow, student profile header action, working docs and release notes. Google Play/App Store dashboard form submissions destructive/external visible oldugu icin bu slice'ta sadece hazirlik ve yonlendirme.
Cikti: SQL/TS/TSX patch, hosted/local migration apply attempt, admin/mobile typecheck/lint validation, net release status.
Yasaklar: store console'da kullanici onayi olmadan submit/deploy/yayin yok, unrelated dirty revert yok, auth flow redesign yok, push token absence'i veri kaybi gibi gosterme yok.
Standartlar: AGENTS.md zero-trust, explicit errors, no silent failures, strict typing, minimal focused diff.
# Current Plan (Published Media Hardening)

- **Date:** 2026-05-09
- **Branch:** `feature/code-review-refactor-sweep`
- **Goal:** Prevent published event and announcement media from being replaced by arbitrary caller-supplied public URLs, and clean up newly published public objects when DB writes fail.

## Published Media Architectural Decisions

- Treat private staging paths as the only source for newly published media. Caller-provided public preview URLs are not trusted for persistence.
- For published updates without a new staged object, preserve the existing DB media URL when the form still sends it, or clear media when the form sends an empty URL.
- For published creates without staged media, store `null` media instead of trusting a submitted URL.
- Roll back a newly copied public object on both DB error and no-row update paths.
- Add a forward Supabase trigger migration that rejects published event/announcement media URLs unless they are same-project public URLs in the expected bucket.

## Prompt

Sen OmaLeima admin media transport ve Supabase storage hardening engineer olarak calisiyorsun.
Hedef: Published event/announcement media alanlarinin arbitrary caller-supplied public URL ile degistirilmesini engelle; publish-copy sonrasi DB write basarisiz olursa yeni public object'i temizle; DB seviyesinde expected bucket URL invariant'i ekle.
Mimari: Next.js route transport server-side URL decision + existing private staging publish helper + public storage cleanup rollback + forward-only Postgres trigger guard.
Kapsam: admin event/announcement transport, media cleanup helper if needed, Supabase media guard migration, focused validation. Historical migrations, mobile flows, unrelated dirty files yok.
Cikti: Strict TS/SQL patch, admin typecheck/lint or targeted TS validation, local migration validation if feasible.
Yasaklar: caller URL fallback yok, applied migration rewrite yok, silent cleanup failure yok, unrelated revert yok, broad UI redesign yok.
Standartlar: AGENTS.md zero-trust, explicit errors, strict typing, focused minimal diff, no silent failures.

# Current Plan (Event Create Constraint + Mobile UI Polish)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Fix the admin event create ticket URL constraint error and polish the reported mobile Approt, Yhteisö, and login layout regressions.

## Architectural Decisions

- Keep `ticketUrl` optional at validation time and persist an absent value as `null`, never as an empty string.
- Leave same-venue stamp limit at `1` for this slice because current admin/mobile validation and product safety rules enforce one leima per student per event venue.
- Move Approt date metadata into the image thumbnail overlay and move profile access into the right header action cluster so text gets more horizontal space.
- Make student event card actions compact and center-aligned while preserving separate join, map, and card-detail tap behavior.
- Reduce Yhteisö announcement rail card height by lowering image/body density instead of hiding actions.
- Convert the student club card footer into an explicit press target that opens email directly when a contact email exists.
- Simplify login by moving the FI/EN selector onto the slider, removing the separate hero brand text, and using shorter panel copy.

## Prompt

Sen OmaLeima release polish full-stack engineer olarak calisiyorsun.
Hedef: Admin event create akisinda bos ticket URL'nin DB check constraint hatasina dusmesini engelle; mobil Approt/Yhteisö/Login ekranlarinda kullanicinin raporladigi sikisma ve tiklanabilirlik sorunlarini duzelt.
Mimari: Next.js server transport null-normalization + Expo React Native focused component layout updates + existing preference/i18n/theme APIs. Yeni dependency yok.
Kapsam: event create transport, student event card/header, announcement rail card density, public club directory footer tap target, login hero/auth panel density, working docs and validation. Same-venue limit davranisi bu slice'ta degismeyecek; sadece mevcut neden aciklanacak.
Cikti: strict typed TS/TSX patch, admin/mobile typecheck/lint/export validation, updated handoff.
Yasaklar: DB invariant'i UI-only bypass etmek yok, `any` yok, fallback URL kabul etmek yok, unrelated revert yok, store console publish/submit yok.
Standartlar: AGENTS.md, explicit errors, minimal focused diff, accessible tappable controls, Finnish/English localization, existing visual system.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `git --no-pager diff --check`

# Current Plan (Login Role Selector Polish)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Make the login role selector read as role choice, not provider choice, and slightly lift the language toggle away from slide copy.

## Architectural Decisions

- Replace the student role selector Google icon with the neutral `id-card` icon already available in the local icon set.
- Keep Google and Apple branding only on the actual student sign-in buttons.
- Leave the business role selector as a business/building icon and keep the existing business password sign-in flow intact.
- Move the slider language toggle a few pixels upward without changing its size or interaction model.

## Prompt

Sen Expo login UX polish engineer olarak calisiyorsun.
Hedef: Login rol secicisinde `Opiskelija/Student` butonundaki Google ikonunu provider olmayan ogrenci/kimlik ikonuyla degistir; Google ve Apple branding sadece gercek giris butonlarinda kalsin; slider dil secimini biraz yukari al ve business role yuzeyinde bariz bir tasarim tutarsizligi varsa ayni minimal diff icinde toparla.
Mimari: mevcut `AppIcon`, login screen styles ve login hero styles. Yeni dependency yok.
Kapsam: `apps/mobile/src/app/auth/login.tsx`, `LoginHero`, working docs and validation. Auth semantics, Supabase provider config ve native Apple integration degismeyecek.
Cikti: strict typed TSX style patch and mobile validation.
Yasaklar: provider flow degistirmek yok, yeni icon library eklemek yok, unrelated mobile screens yok, `any` yok.
Standartlar: AGENTS.md, accessible role buttons, minimal focused diff, existing visual language.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `git --no-pager diff --check`

# Current Plan (Cached Egress + Approt Ticket Cards)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Explain and reduce future Supabase cached egress pressure, and refine Approt event cards into a more polished ticket-style layout.

## Architectural Decisions

- Treat cached egress as Supabase Storage/CDN bandwidth, not a stale app-cache bug.
- Extend `cacheControl` for immutable public media uploads to one year so browsers/native image caches can avoid repeat CDN hits where supported.
- Leave existing public objects untouched in this slice; replacing/re-uploading high-traffic assets can refresh metadata later.
- Keep the Approt screen focused on event discovery with a page title/subtitle instead of global `OmaLeima` branding.
- Build ticket styling in React Native views only: right-side action strip, subtle perforation cues, image date text without a background pill, and aligned map/join buttons.

## Prompt

Sen Supabase maliyet farkindaligi olan Expo UI polish engineer olarak calisiyorsun.
Hedef: Cached Egress quota uyarisi icin teknik nedeni netlestir ve repo tarafinda future public media cache headers'i iyilestir; student Approt event kartlarini ticket gorunumune getir, date textini gorselin sol altinda backgroundsuz goster, `OmaLeima` header'i sayfa basligi/subtitle ile degistir, `Kartta` ve `Liity` aksiyonlarini ayni sag action aksinda hizala.
Mimari: immutable public media upload cache-control update + focused React Native component styles. Yeni dependency yok.
Kapsam: public media upload helpers, `EventCard`, student events header, working docs and validation. Supabase billing plan upgrade veya destructive storage cleanup yok.
Cikti: strict typed TS/TSX patch, Supabase quota explanation, validation results.
Yasaklar: mevcut objectleri silmek yok, user media URLlerini kiracak migration yok, publish/store submit yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, minimal focused diff, accessible buttons, existing mobile visual system, explicit explanation of remaining external billing risk.

## Validation Plan

- `npm --prefix apps/admin run typecheck`
- `npm --prefix apps/admin run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `npm --prefix apps/mobile run audit:store-release-readiness`
- `git --no-pager diff --check`

# Current Plan (Community Ticket Cards + Business Notification Icon)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Bring Yhteisö cards into the same neutral ticket-style visual system as Approt and align the business profile notification icon with the rest of the profile settings rows.

## Architectural Decisions

- Replace the framed Yhteisö hero with the same page-title/subtitle hierarchy used by Approt.
- Keep announcement card behavior intact and only align surface, radius, border, and rail density with Approt cards.
- Redesign student club cards as compact horizontal ticket cards: image on the left, club copy in the middle, and detail/email actions in a right-side ticket strip.
- Keep modal details and `mailto:` behavior unchanged.
- Update `PushNotificationSetupCard` layout globally for business/club setup cards by removing the icon background and centering it like profile preference icons.

## Prompt

Sen Expo React Native UI polish engineer olarak calisiyorsun.
Hedef: Student Yhteisö sayfasindaki Tiedotteet ve Opiskelijaklubit kartlarini Approt ticket kartlariyla ayni yuzey/radius/border diline yaklastir; kulüp kartlarini yatay ticket tasarimina cevir; business profilindeki Ilmoitukset ikonunu diger preference ikonlariyla hizala ve arka plan rengini kaldir.
Mimari: mevcut theme tokenlari, `CoverImageSurface`, `AppIcon`, `InfoCard`, `PushNotificationSetupCard`. Yeni dependency yok.
Kapsam: `updates.tsx`, `announcement-feed-section.tsx`, `public-club-directory-section.tsx`, `push-notification-setup-card.tsx`, working docs and validation. Auth, push registration behavior, data fetching ve modal contact akislarina dokunma.
Cikti: strict typed TSX style/layout patch and mobile validation.
Yasaklar: email/detail tap targetlarini kaybetmek yok, `any` yok, yeni UI library yok, unrelated revert yok.
Standartlar: AGENTS.md, accessible press targets, Finnish/English text safety, minimal focused diff, existing Approt visual language.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

# Current Plan (Business Surfaces + History Filter Sheet)

- **Date:** 2026-05-09
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Remove nested-card visual clutter from business event surfaces, redesign ROI as a cleaner impact dashboard, simplify student club summary/actions, and move business history filters into one sheet.

## Architectural Decisions

- Keep business event sections unframed and let the actual event rail cards be the primary surfaces.
- Use neutral `surfaceL1` cards and default borders instead of stacked `surfaceL2` panels inside framed sections.
- Simplify student club summary to a small numeric count only and replace the email text action with a mail icon.
- Implement the history filter panel locally with React Native `Modal`, using existing date/event state and no new dependency.
- Redesign ROI by making the hero unframed, metrics more dashboard-like, and event rows cleaner with less nested pill background noise.

## Prompt

Sen Expo React Native release UI engineer olarak calisiyorsun.
Hedef: Business Approt/events sayfasindaki kart-icinde-kart arka planlarini kaldir; ROI ekranini verified impact dashboard olarak yeniden duzenle; student Yhteisö Opiskelijaklubit ozetindeki gereksiz contact-ready metnini kaldir ve email aksiyonunu ikon yap; business Historia filtrelerini tek acilir panelde topla.
Mimari: mevcut theme tokenlari, `AppScreen`, `InfoCard`, `Modal`, local component state. Yeni dependency yok.
Kapsam: `business/events.tsx`, `business/reports.tsx`, `business/history.tsx`, `public-club-directory-section.tsx`, working docs and validation. Data queries, Supabase logic, route semantics degismeyecek.
Cikti: strict typed TSX style/layout patch and mobile validation.
Yasaklar: para/ciro ROI tahmini eklemek yok, filter logic'i bozmak yok, inaccessible icon-only button yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, frontend-design skill, accessible press targets, Finnish/English localization, minimal focused diff.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

# Current Plan (Final Mobile UI Micro Polish)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Apply small visual acceptance fixes across student community, business events/ROI, and student rewards handoff surfaces.

## Architectural Decisions

- Move the student club count into the `InfoCard` title as a compact right-side count; no extra text.
- Keep both club action buttons icon-only and neutral, with lime icon color and accessibility labels.
- Add small horizontal padding to business event rails/sections without restoring nested section card backgrounds.
- Reduce ROI bottom padding to match other production surfaces.
- Pass an auth metadata display name into `RewardProgressCard`, falling back to the short student ID only when no name exists.
- Use a neutral handoff ticket background with lime accent border/text instead of a full lime surface.

## Prompt

Sen Expo React Native release UI polish engineer olarak calisiyorsun.
Hedef: Student Yhteisö Opiskelijaklubit sayisini sag ustte kompakt goster; e-posta icon butonunu bilgi ikonu gibi arka plansiz yap; business Approt/event kart rail'lerine home kartlari gibi nefes payi ver; ROI sayfasinin gereksiz alt padding'ini azalt; student Palkinnot claimable handoff alaninda student id yerine kullanici ad-soyad goster ve arka plani daha dengeli yap.
Mimari: mevcut theme tokenlari, auth user metadata display name extraction, focused component prop extension. Yeni dependency yok.
Kapsam: `public-club-directory-section.tsx`, `business/events.tsx`, `business/reports.tsx`, `student/rewards.tsx`, `reward-progress-card.tsx`, working docs and validation.
Cikti: strict typed TSX patch and mobile validation.
Yasaklar: reward claim logic veya DB query degistirmek yok, inaccessible icon-only button yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, frontend-design skill, accessible press targets, Finnish/English safe fallbacks, minimal focused diff.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`

# Current Plan (Profile Typography + Collapsible Scanner)

- **Date:** 2026-05-10
- **Branch:** `feature/apple-sign-in-store-release`
- **Goal:** Align business profile notification text with other profile rows, keep typography on shared app tokens, and make the business scanner event selector collapsible.

## Architectural Decisions

- Adjust `PushNotificationSetupCard` icon column to match the existing profile preference icon width.
- Do not flatten every screen text to one literal size; preserve hierarchy through the existing global theme typography tokens (`body`, `bodySmall`, `caption`, etc.).
- For scanner, add local expanded/collapsed state around the multi-event selector. Show selected event summary while collapsed and keep the rail available on expand.
- Keep scanner selection, locking, PIN, scan submit, and route behavior unchanged.

## Prompt

Sen Expo React Native release UI engineer olarak calisiyorsun.
Hedef: Business profilinde Ilmoitukset satirinin text hizasini diger preference satirlariyla esitle; profil textlerini mevcut global typography tokenlarina hizala; business scanner'daki coklu event seciciyi acilir/kapanir hale getir.
Mimari: mevcut `PushNotificationSetupCard`, `business/scanner.tsx`, theme typography tokenlari. Yeni dependency yok.
Kapsam: notification setup layout, scanner event selector UI, working docs and validation. Auth/push/scanner submit logic degismeyecek.
Cikti: strict typed TSX style/layout patch and mobile validation.
Yasaklar: tek literal font-size ile tum uygulama hiyerarsisini bozmak yok, scanner event switching'i gizlemek yok, `any` yok, unrelated revert yok.
Standartlar: AGENTS.md, frontend-design skill, shared typography tokens, accessible toggle controls.

## Validation Plan

- `npm --prefix apps/mobile run typecheck`
- `npm --prefix apps/mobile run lint`
- `git --no-pager diff --check`
