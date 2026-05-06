# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

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
