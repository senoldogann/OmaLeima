# OmaLeima Production Review Result

**Tarih:** 2026-05-07  
**Branch:** `feature/code-review-refactor-sweep`  
**Kapsam:** App Store, Google Play Store ve web production yayını öncesi tüm workspace production review  
**Karar:** **PUBLIC PRODUCTION / APP STORE / GOOGLE PLAY ICIN READY DEGIL**

Bu review kod değişikliği yapmadan, mevcut workspace'i okuyarak ve non-destructive doğrulama komutları çalıştırılarak hazırlandı. Sadece bu rapor dosyası oluşturuldu.

## Yönetici Özeti

OmaLeima mimari olarak güçlü bir temel üzerine kurulmuş: Supabase RLS, atomic RPC'ler, scanner device doğrulaması, SecureStore tabanlı mobil auth storage, Turnstile korumalı web giriş/formları ve çok sayıda smoke/audit script mevcut. Ancak public store ve web production cutover için halen release-blocker seviyesinde riskler var.

En kritik durumlar:

1. Mobil store release gate şu an **fail**: `audit:store-release-readiness` `nativeFeedbackSourceReady=false` ile kırılıyor.
2. iOS App Store için Google-only login devam ediyor; Sign in with Apple veya eşdeğer privacy-preserving login yok.
3. Android fiziksel cihazda Google OAuth + remote push ve public store dağıtımı henüz kanıtlanmamış.
4. Çalışma ağacı çok büyük ölçüde dirty; production'a hangi commit/artefact'ın çıkacağı izlenebilir değil.
5. Hosted Supabase migration/function drift, Deno Edge Function typecheck ve local DB lint bu turda kanıtlanamadı.
6. Accessibility tarafında store/legal risk doğurabilecek küçük touch target'lar ve web focus outline kaldırmaları var.
7. Production verisini silebilen bootstrap scriptleri default production project ref ile çalışabilecek şekilde duruyor.

Bu nedenle önerilen karar: **Private pilot sınırlı kapsamda, mevcut runbook kısıtlarıyla yürütülebilir; public App Store / Play Store / web production cutover ertelenmeli.**

## Kapatma Takibi

- [x] P0-1 mobile store release gate: audit script güvenli `requireOptionalNativeModule("ExpoAudio")` kontratını kabul ediyor; `audit:store-release-readiness` PASS.
- [ ] P0-2 iOS App Store login policy: Google-only login için Sign in with Apple veya yazılı exemption kararı gerekiyor.
- [ ] P0-3 physical-device + hosted credential smoke: gerçek cihaz/TestFlight/Internal Track ve hosted credential testleri gerekiyor.
- [ ] P0-4 dirty worktree traceability: release candidate commit/tag temizliği gerekiyor.
- [x] P0-5 destructive script risk: production ref default kaldırıldı; showcase reset explicit destructive confirmation ve production confirmation istiyor.
- [ ] P0-6 Edge Function/migration parity: Deno ve local/linked DB lint/diff gate hâlâ ayrı ortam gerektiriyor.
- [x] P1-1 mobile touch targets: rapordaki interactive target’lar en az 44pt/dp seviyesine çekildi.
- [x] P1-2 web focus visible: `outline: none` kaldırıldı, görünür focus outline eklendi.
- [x] P1-3 admin/organizer mutation rate limit: DB-backed merkezi authenticated mutation rate limit eklendi, yüksek riskli dashboard mutation route'larına bağlandı ve Vercel production deploy edildi.
- [x] P1-4 scanner PIN brute-force lockout: scanner device PIN failed-attempt/cooldown kolonları ve `SCANNER_PIN_LOCKED` akışı DB, Edge Function ve mobile copy seviyesinde uygulandı; `scan-qr` production deploy edildi.
- [x] P1-5 public media bucket policy: event/announcement medya icin private `media-staging` bucket + signed preview + publish-time public copy stratejisi uygulandi; hosted Supabase private bucket, staging kolonlari, RLS policies ve guard trigger'lari dogrulandi.
- [x] P1-6 seed backdoor risk: `supabase/seed.sql` gerçek auth kullanıcıları bulunan DB’de explicit override olmadan çalışmayı reddediyor.
- [x] P1-7 mobile realtime audit: local sign-out/session-provider kontratı audit’e eklendi; audit PASS.
- [x] P1-8 offline scanner queue/stale build enforcement: stale standalone build gate eklendi; offline scanner icin atomic QR garantisini bozmayan manual fallback runbook'u production checklist'e baglandi.
- [x] P1-9 performance: mobile web bundle budget audit eklendi, student public event discovery bounded hale getirildi ve announcement recipient DB lookuplari batch'lendi.
- [ ] P1-10 critical regression tests: QR/scan/reward/RLS entegrasyon testleri hâlâ eklenecek.
- [x] P2-1 mobile lint warnings: mevcut 6 warning temizlendi; mobile lint PASS.
- [x] P2-2 admin `.env.example`: dosya mevcut ve zorunlu hosted/public env’leri listeliyor.
- [x] P2-3 disabled accessibility state: Google sign-in ve mobile consent disabled state screen reader’a aktarılıyor.
- [ ] P2-4 consent modal Android back behavior: legal UX kararı ve cihaz accessibility smoke hâlâ yapılacak.

## Son Kapatma Doğrulaması

| Komut | Sonuç |
|---|---|
| `npm --prefix apps/mobile run lint` | PASS |
| `npm --prefix apps/mobile run typecheck` | PASS |
| `npm --prefix apps/admin run lint` | PASS |
| `npm --prefix apps/admin run typecheck` | PASS |
| `npm --prefix apps/admin run build` | PASS |
| `npm --prefix apps/mobile run audit:store-release-readiness` | PASS |
| `npm --prefix apps/mobile run audit:realtime-readiness` | PASS |
| `npx --yes supabase@2.98.2 db query --linked --file supabase/migrations/20260508100000_public_media_draft_guard.sql --output json` | PASS: hosted public draft media guard uygulandı |
| Hosted draft public media verification queries | PASS: triggers mevcut, draft event public media `0`, draft announcement public media `0` |
| `npm --prefix apps/mobile run smoke:native-simulators -- --android` | PASS: Android release APK emulator build/install/launch, UI dump, crash log ve screenshot artifact alindi |
| `npm --prefix apps/mobile run smoke:native-simulators -- --ios` | PASS: iOS Release simulator build/install/launch, process/log check ve screenshot artifact alindi |
| `npm run qa:mobile-native-simulator-smoke` | PASS: lint/typecheck/web export/native audits + Android/iOS executable simulator launch smoke birlikte gecti |
| `npx --yes supabase@2.98.2 db query --linked --file supabase/migrations/20260508103000_private_media_staging.sql --output json` | PASS: hosted private media staging migration uygulandi |
| Hosted private media staging verification queries | PASS: `media-staging` bucket `public=false`, event/announcement staging kolonlari, storage RLS policies ve guard trigger/function'lari mevcut |
| `npm --prefix apps/mobile run export:web` | PASS |
| `npm --prefix apps/mobile run audit:web-bundle-budget` | PASS |
| `git --no-pager diff --check` | PASS |

## Kullanılan Yaklaşım

- Zorunlu proje bağlamı okundu: `AGENTS.md`, `LEIMA_APP_MASTER_PLAN.md`, `PROGRESS.md`, `TODOS.md`, `PLAN.md`, `REVIEW.md`.
- Repo memory okundu: mobile navigation ve typography notları.
- Güvenlik, database, mobile, admin web, performance, accessibility ve genel production review için çoklu subagent çıktıları sentezlendi.
- Subagent bulguları doğrudan rapora alınmadı; yüksek riskli olanlar mevcut dosyalardan tekrar doğrulandı.
- Non-destructive gate komutları çalıştırıldı. Hosted DB mutation, production push veya store submission başlatılmadı.

## Doğrulama Komutları

| Komut | Sonuç |
|---|---|
| `git status --short` | **FAIL / risk:** 100+ modified ve çok sayıda untracked dosya var. |
| `npm --prefix apps/admin run typecheck` | PASS |
| `npm --prefix apps/mobile run typecheck` | PASS |
| `npm --prefix apps/admin run lint` | PASS |
| `npm --prefix apps/mobile run lint` | PASS with warnings: 6 warning |
| `npm --prefix apps/admin run build` | PASS |
| `npm --prefix apps/mobile run export:web` | PASS, fakat ana web entry bundle `4.2MB` |
| `npm --prefix apps/mobile run audit:store-release-readiness` | **FAIL:** `nativeFeedbackSourceReady=false` |
| `npm --prefix apps/mobile run audit:native-simulator-smoke` | PASS |
| `npm --prefix apps/mobile run audit:native-push-device-readiness` | PASS repo wiring |
| `npm --prefix apps/mobile run audit:realtime-readiness` | **FAIL:** session-provider audit shape mismatch |
| `npm --prefix apps/mobile run audit:hosted-business-scan-readiness` | PASS repo wiring |
| `npm --prefix apps/admin audit --audit-level=moderate` | PASS, 0 vulnerabilities |
| `npm --prefix apps/mobile audit --audit-level=moderate` | PASS, 0 vulnerabilities |
| `command -v deno` | **FAIL:** Deno yok |
| `npx --yes supabase@2.98.2 db lint --local` | **FAIL:** local Postgres `127.0.0.1:54322` connection refused |
| `git --no-pager diff --check` | PASS |
| VS Code Problems API | PASS, no errors found |

## P0 Release Blockers

### P0-1. Mobile store release gate kırık

**Kanıt:** `npm --prefix apps/mobile run audit:store-release-readiness` çıktısı `mobile-store-release-readiness:failed` ve `nativeFeedbackSourceReady=false` döndü.

Audit script `apps/mobile/scripts/audit-store-release-readiness.mjs:430-441` içinde native feedback için `expo-audio`, `expo-haptics`, app config plugin'i ve `scan-success.wav` / `scan-warning.wav` / `scan-error.wav` marker'larını kontrol ediyor. Aynı script ayrıca literal `import("expo-audio")` arıyor.

Mevcut source `apps/mobile/src/features/foundation/safe-scan-feedback.ts:57-74` içinde stale native build redbox riskini önlemek için `requireOptionalNativeModule("ExpoAudio")` sonrası `require("expo-audio")` kullanıyor. Bu mantık bilinçli olabilir, ancak release gate ile source contract uyuşmuyor.

**Risk:** Store submission öncesi zorunlu repo gate kırık. Bu gate yeşil olmadan App Store / Play Store release adayına geçilmemeli.

**Gerekli aksiyon:** Ya audit script yeni güvenli `requireOptionalNativeModule` modelini kabul edecek şekilde güncellenmeli ya da source audit'in beklediği kontrata döndürülmeli. Sonrasında `npm run qa:mobile-store-release-readiness` yeşil olmalı.

### P0-2. iOS App Store login policy riski açık

**Kanıt:** `apps/mobile/package.json:17-73` dependency listesinde `expo-apple-authentication` yok. `apps/mobile/app.config.ts:1-218` plugin listesinde Apple auth yok. Workspace aramasında `signInWithApple`, `AppleAuthentication` veya Supabase `provider: "apple"` bulunmadı.

Runbook da aynı riski açıkça söylüyor: `docs/LAUNCH_RUNBOOK.md:45-55` broader public launch öncesinde iOS login policy gap'in kapanması gerektiğini yazıyor; `docs/LAUNCH_RUNBOOK.md:87-101` store checklist içinde Sign in with Apple veya eşdeğer login seçeneğini şart koşuyor.

**Risk:** Google birincil login ise Apple Guideline 4.8 kapsamında public App Store review reject riski var.

**Gerekli aksiyon:** Sign in with Apple eklenmeli veya Apple review için geçerli, yazılı exemption kanıtı hazırlanmalı. Bu akış fiziksel iOS build ile test edilmeli.

### P0-3. Public launch için fiziksel cihaz ve hosted credential smoke eksik

**Kanıt:** `docs/LAUNCH_RUNBOOK.md:17-32` mevcut doğrulanmış durumu ve eksikleri listeliyor. Eksikler arasında Android remote push physical-device smoke, Android student Google sign-in real Android development build, public store dağıtımı, custom domain cutover ve real operator identities var.

**Risk:** Kaynak kodun build olması, camera permission prompt, Google OAuth native callback, FCM/Expo remote push, notification tap routing, screenshot protection, share sheet, gallery save ve production domain/session davranışını kanıtlamaz.

**Gerekli aksiyon:** TestFlight ve Android internal track üzerinde gerçek cihaz smoke matrisi tamamlanmalı. Hosted admin/organizer credential smoke gerçek staging/prod credentials ile koşulmalı.

### P0-4. Dirty worktree release traceability'yi bozuyor

**Kanıt:** `git status --short` çıktısı `PLAN.md`, `PROGRESS.md`, admin app, mobile app, Supabase functions/migrations ve çok sayıda untracked feature dosyası dahil 100+ değişiklik gösteriyor.

**Risk:** Public release için hangi commit'in deploy edildiği, hangi migration/function sürümünün prod'a çıktığı ve rollback noktası belirsiz. Bu durum store submission ve web production cutover için kabul edilebilir değil.

**Gerekli aksiyon:** Release candidate temiz branch/commit/tag üzerinden hazırlanmalı. Deploy sadece tag'lenmiş commit'ten yapılmalı. Dirty worktree ile production deploy engellenmeli.

### P0-5. Production veri silme riski taşıyan scriptler mevcut

**Kanıt:** `apps/admin/scripts/_shared/supabase-auth-config.ts:5` içinde production Supabase project ref default olarak kodda duruyor: `jwhdlcnfhrwdxptmoret`. Aynı dosyada `readProjectRef` override yoksa default project ref'e dönüyor (`apps/admin/scripts/_shared/supabase-auth-config.ts:56-64`).

`apps/admin/scripts/bootstrap-showcase-events.ts:379-387` genel `deleteAllRowsAsync` helper'ı ile `.delete().neq(...)` kullanıyor. `apps/admin/scripts/bootstrap-showcase-events.ts:496-519` events, stamps, QR token uses, reward claims, notifications, announcements gibi production açısından kritik tabloları siliyor.

**Risk:** Yanlış environment ile çalışan bir bootstrap script production veri kaybına yol açabilir. Script adı showcase/demo gibi görünse de destructive davranıyor.

**Gerekli aksiyon:** Production ref default'u kaldırılmalı, destructive scriptler explicit environment guard ve güçlü confirmation env var olmadan production ref'te çalışmamalı. Script isimleri destructive intent'i açıkça taşımalı.

### P0-6. Supabase Edge Function / migration production parity kanıtlanamadı

**Kanıt:** `command -v deno` başarısız. `npx --yes supabase@2.98.2 db lint --local` local database bağlantısında `127.0.0.1:54322` refused verdi. Bu nedenle Deno typecheck ve local DB lint bu turda koşulamadı.

**Risk:** TypeScript app build'leri Supabase Deno function import/URL/runtime uyumluluğunu kanıtlamaz. Local migration lint olmadan schema drift veya migration order riski kalır. Hosted drift ayrıca bu turda read-only olarak doğrulanmadı.

**Gerekli aksiyon:** Deno CLI kurulup Edge Functions `deno check` edilmeli. Local Supabase stack ya da linked read-only migration/diff gate yeşil olmalı. Hosted function versions ve migrations release candidate commit'iyle eşleştirilmeli.

## P1 High Findings

### P1-1. Accessibility: mobile touch target'lar store risk eşiğinin altında

**Kanıt:** `apps/mobile/src/features/announcements/announcement-feed-section.tsx:387`, `:415`, `:545` içinde `minHeight: 42`; `apps/mobile/src/app/student/leaderboard.tsx:716` içinde `minHeight: 40`; `apps/mobile/src/app/business/history.tsx:602` içinde `minHeight: 38`; `apps/mobile/src/features/club/public-club-directory-section.tsx:535` içinde `minHeight: 34` bulundu.

**Risk:** iOS HIG 44pt ve Android Material 48dp beklentileriyle çakışabilir. Store review ve accessibility scanner uyarısı riski var.

**Gerekli aksiyon:** Tüm interactive touch target'lar en az 44x44 pt/dp olacak şekilde normalize edilmeli, Android Accessibility Scanner ve iOS VoiceOver ile gerçek cihazda doğrulanmalı.

### P1-2. Accessibility: web focus indicator bazı alanlarda kaldırılmış

**Kanıt:** `apps/admin/src/app/globals.css:452`, `:743`, `:874`, `:3741`, `:3934`, `:4727`, `:4971`, `:5241`, `:5378` satırlarında `outline: none` var.

**Risk:** Keyboard-only kullanıcılar focus konumunu göremeyebilir. Bu WCAG 2.4.7 Focus Visible açısından ciddi risk ve Finlandiya/EU accessibility compliance açısından problemli.

**Gerekli aksiyon:** `outline: none` kaldırılmalı veya her selector için 3:1 kontrastlı, görünür `:focus-visible` stili eklenmeli. Lighthouse/axe + keyboard-only smoke koşulmalı.

### P1-3. Admin/organizer mutation endpoint'lerinde genel rate limit yok

**Kanıt:** `apps/admin/src/app/api/**` aramasında rate limit mantığı yalnızca `apps/admin/src/app/api/contact/route.ts:15-17` ve ilgili helper'larda bulundu. Admin/club mutation route'ları build çıktısında çok sayıda dinamik endpoint olarak mevcut: `/api/announcements/create`, `/api/club/events/create`, `/api/admin/users/status`, `/api/admin/support-requests/reply`, reward/event/account mutations vb.

**Risk:** Compromised authenticated admin/organizer hesabı veya otomasyon, event/announcement/reward/user mutation endpoint'lerini hızlıca spamleyebilir. Bu hem maliyet hem data integrity hem de push abuse riski doğurur.

**Gerekli aksiyon:** Authenticated mutation endpoint'leri için per-user, per-role ve mümkünse per-IP distributed rate limit eklenmeli. Public contact formdaki DB-backed rate limit modeli yeniden kullanılabilir.

### P1-4. Scanner PIN brute-force lockout yok

**Kanıt:** `supabase/migrations/20260507222000_scan_stamp_card_full_limit.sql:97-108` scanner PIN hash doğrulamasını `crypt(v_submitted_pin, v_scanner_pin_hash)` ile yapıyor ve yanlış PIN için `SCANNER_PIN_INVALID` dönüyor. Aynı blokta failed attempt sayacı, lockout veya cooldown yok.

**Risk:** Scanner PIN 4-6 haneli pratik bir PIN ise online brute-force denemeleri rate limit olmadan devam edebilir. Device registration var ama çalınmış/aktif device context'te PIN denemeleri kilitlenmiyor.

**Gerekli aksiyon:** `business_scanner_devices` veya ayrı audit tabloda failed PIN attempt sayacı, `locked_until`, reset-on-success ve alerting eklenmeli. Edge Function'da da request-level rate limit olmalı.

### P1-5. Public storage buckets taslak/onaylanmamış medya sızıntısı riski taşıyor

**Kanıt:** `supabase/migrations/20260503190000_event_media_storage.sql:1-39`, `supabase/migrations/20260501103000_business_media_storage.sql:1-39`, `supabase/migrations/20260504020000_announcement_media_storage.sql:1-39` ilgili bucket'ları `public = true` oluşturuyor ve `storage.objects` SELECT policy'leri `using (bucket_id = ...)` ile herkese okuma veriyor.

**Risk:** URL tahmin edilemese bile, taslak event cover'ları, onaylanmamış business media veya henüz yayınlanmamış announcement media public object URL elde edildiğinde görülebilir. Bu legal/privacy değilse bile launch öncesi content governance riski.

**Gerekli aksiyon:** Public media bucket stratejisi bilinçli olarak dokümante edilmeli. Taslak/onaylanmamış objeler için private bucket + signed URL veya publish sonrası public copy modeli değerlendirilmeli.

**2026-05-08 ilerleme:** `20260508100000_public_media_draft_guard.sql` hosted Supabase'e uygulandı. Draft `events.cover_image_url` ve `announcements.image_url` alanlarında OmaLeima public storage URL'leri DB trigger ile reddediliyor; mevcut draft public URL sayıları hosted ortamda `0` doğrulandı. Web draft upload akışı bloklandı, mobil draft save/update public URL persist etmiyor ve başarılı draft kaydından sonra yeni yüklenen public objeyi temizliyor.

**2026-05-08 kapanış:** `20260508103000_private_media_staging.sql` hosted Supabase'e uygulandı. `media-staging` bucket private ve owner-scoped RLS policy'leriyle aktif; `events.cover_image_staging_path` ve `announcements.image_staging_path` kolonları eklendi. Admin web ve organizer mobile event/announcement upload akışları private staging + signed preview modeline geçti; publish/update sırasında public bucket'a kopyalanıyor, staging path temizleniyor ve eski owned media objeleri siliniyor. Kalan bilinçli kapsam: business profile/logo ve login-slide gibi doğrudan public olması beklenen yönetilen medya bu slice dışında.

### P1-6. `supabase/seed.sql` production'da çalışırsa backdoor hesap yaratabilir

**Kanıt:** `supabase/seed.sql:29-32` predictable UUID'lerle `admin@omaleima.test`, `organizer@omaleima.test`, `scanner@omaleima.test`, `student@omaleima.test` hesaplarını tanımlıyor. `supabase/seed.sql:59-63` ve devamında `password123` hashleniyor.

**Risk:** Seed yanlışlıkla production DB'ye uygulanırsa predictable test/admin hesapları oluşabilir.

**Gerekli aksiyon:** Seed dosyasına local-only guard eklenmeli veya production runbook'ta seed'in prod'a uygulanmasını engelleyen otomatik kontrol olmalı. Production DB'de `*@omaleima.test` hesaplarının olmadığı read-only query ile doğrulanmalı.

### P1-7. Mobile realtime audit kırık veya session-provider kontratı stale

**Kanıt:** `npm --prefix apps/mobile run audit:realtime-readiness` `mobile-realtime-audit:unexpected-session-provider-shape` ile fail oldu. Audit script `apps/mobile/scripts/audit-realtime-readiness.mjs:174-181` `supabase.auth.signOut()` string'ini bekliyor. Mevcut provider ise `apps/mobile/src/providers/session-provider.tsx:38-44` içinde `supabase.auth.signOut({ scope: "local" })` kullanıyor ve `apps/mobile/src/providers/session-provider.tsx:149-160` içinde profile status realtime subscription içeriyor.

**Risk:** Kod doğru olabilir, audit stale olabilir; ama release gate fail olduğu için production readiness kanıtı kırık. Stale audit de tehlikelidir, çünkü gelecekte gerçek regression'ı kaçırabilir veya release'i yanlış bloke edebilir.

**Gerekli aksiyon:** Audit script yeni local sign-out kontratını tanıyacak şekilde güncellenmeli ve `npm run qa:mobile-realtime-readiness` yeşile dönmeli.

### P1-8. Offline scanner queue ve stale build / force-update mekanizması yok

**Kanıt:** `apps/mobile/src/app/business/scanner.tsx` içinde sadece retry nonce gibi lokal retry UI var; workspace aramasında offline queue, enqueue, NetInfo, force update veya minimum version kontrolü bulunmadı. `apps/mobile/eas.json:1-14` remote app version source kullanıyor, ancak client-side stale build enforcement yok.

**Risk:** Event sırasında zayıf internet varsa scan denemeleri kaybolur; eski native build'ler yeni Supabase/Expo contract'larını desteklemeyebilir. Özellikle QR scanner ve push/audio native modules için pilot günü operasyon riski.

**Gerekli aksiyon:** Scanner için kontrollü offline retry/queue tasarımı veya açık manual fallback runbook'u ürünleştirilmelidir. Stale build için minimum supported version endpoint ve blocking/update prompt eklenmeli.

### P1-9. Performance: mobile web bundle çok büyük; bazı fetch path'leri unbounded

**Kanıt:** `npm --prefix apps/mobile run export:web` ana web entry bundle'ı `4.2MB` üretti. `apps/mobile/src/features/events/student-events.ts:149-170` public events query'sinde `.limit()` veya pagination yok. `supabase/functions/send-announcement-push/index.ts:560-590` recipient user IDs için `device_tokens` query'sini tek `.in("user_id", recipientUserIds)` ile yapıyor; recipient DB query batching yok. Expo Push API tarafında `_shared/expoPush.ts:17-20` ve `:167-218` mesajları 100'lük batch'liyor; risk DB recipient tarafında kalıyor.

**Risk:** Kullanıcı sayısı ve event/announcement hacmi büyüdükçe mobil web load, Supabase response payload ve function execution time artar.

**Gerekli aksiyon:** Bundle budget ve analyzer eklenmeli. Public event list pagination/limit almalı. Announcement recipient resolution 100/500'lük DB batch'lere bölünmeli.

### P1-10. Test stratejisi smoke-heavy, gerçek test dosyası yok

**Kanıt:** `**/*.{test,spec}.{ts,tsx,js,jsx,mjs}` araması sonuç vermedi. `tests/*.mjs` altında 18 wrapper/smoke script var; admin package içinde çok sayıda `smoke:*` script var (`apps/admin/package.json:16-55`).

**Risk:** Smoke scriptler değerli ama unit/integration/regression test dosyası yok. QR JWT abuse, scan race, reward inventory, RLS ve account lifecycle gibi kritik alanlarda CI'ya bağlı deterministik coverage zayıf kalıyor.

**Gerekli aksiyon:** Coverage artırmak için kapsamı dar ama production-kritik entegrasyon testleri eklenmeli: QR token tamper/expiry, scan replay, reward claim inventory, RLS deny matrix, admin status deletion, announcement push retry invariants.

## P2 Medium Findings

### P2-1. Mobile lint warning'leri release öncesi temizlenmeli

**Kanıt:** `npm --prefix apps/mobile run lint` 6 warning verdi: `apps/mobile/src/app/business/events.tsx` hook dependency stability, `apps/mobile/src/app/business/home.tsx` unused `getTimelineBadge`, `apps/mobile/src/app/club/home.tsx` unused `primaryClub`.

**Risk:** Hata değil, ancak release branch kalitesi ve hook behavior güveni için temizlenmeli.

### P2-2. Admin `.env.example` yok

**Kanıt:** `apps/admin/.env.example` bulunamadı. Buna karşın `apps/admin/scripts/check-hosted-env.ts` hosted env kontrolü yapıyor ve build prebuild buna bağlı.

**Risk:** Yeni ortam/CI setup sırasında eksik secret/env değişkenleri geç fark edilir.

**Gerekli aksiyon:** `apps/admin/.env.example` eklenmeli; public env, hosted-only secrets ve ops-only vars ayrılmalı.

### P2-3. Mobile disabled state accessibility coverage tutarsız

**Kanıt:** `apps/mobile/src/features/auth/components/google-sign-in-button.tsx:31-45` disabled button kullanıyor fakat `accessibilityState` yok. `apps/mobile/src/features/legal/mobile-consent-card.tsx:72-85` accept button disabled olabiliyor fakat accessibility state yok.

**Risk:** Screen reader disabled durumunu doğru aktarmayabilir.

**Gerekli aksiyon:** Disabled Pressable'lara `accessibilityState={{ disabled: ... }}` eklenmeli.

### P2-4. Consent modal Android hardware back davranışı bilinçli ama reviewer açısından riskli

**Kanıt:** `apps/mobile/src/features/legal/mobile-consent-card.tsx:60` `onRequestClose={() => undefined}` kullanıyor.

**Risk:** Legal consent bloklayıcı olabilir; ancak reviewer/kullanıcı açısından kapanmayan modal dark-pattern gibi algılanabilir. En azından açık ürün/legal gerekçesi ve accessibility modal props doğrulanmalı.

## Doğrulanmış Yanlış Pozitifler / Kapatılmış Riskler

Bu maddeler subagent çıktılarında risk olarak geldi, ancak mevcut source ile doğrulanınca release blocker olarak rapora alınmadı:

1. **`qr_token_uses` RLS policy yok iddiası yanlış.** `supabase/migrations/20260503103000_report_verified_integrity_fixes.sql:1-18` platform admin, event manager ve business staff read policy'lerini ekliyor.
2. **Scanner device null bypass iddiası mevcut source için yanlış.** Type nullable kalsa da `supabase/functions/scan-qr/index.ts:522-526` null scanner device için `SCANNER_DEVICE_REQUIRED` dönüyor; `:532-566` device ownership/status doğrulaması sonrası RPC çağırıyor.
3. **Auth user deletion sadece profile soft-delete iddiası güncel route için yanlış.** `apps/admin/src/app/api/admin/users/status/route.ts:79-84` `DELETED` status sonrası `serviceRole.auth.admin.deleteUser(payload.userId, true)` çağırıyor.
4. **Reward inventory race iddiası eksik yorum.** `supabase/migrations/20260506163000_critical_rpc_and_event_visibility_hardening.sql:55-79` reward tier row'unu `for update` kilitliyor; `supabase/migrations/20260427180000_initial_schema.sql:228-229` `inventory_claimed <= inventory_total` check constraint içeriyor.
5. **Admin password-session CSRF tamamen açık iddiası abartılı.** `apps/admin/src/features/auth/password-session-guard.ts:14-58` same-origin/referer ve JSON content-type kontrolü yapıyor; `apps/admin/src/app/auth/password-session/route.ts:82-107` Turnstile validation çağırıyor. Ancak login brute-force/rate-limit tasarımı ayrıca ele alınabilir.
6. **Mobile env validation yok iddiası yanlış.** `apps/mobile/src/lib/env.ts:1-27` Zod ile public env doğruluyor ve `apps/mobile/src/lib/supabase.ts:45-58` validated `publicEnv` kullanıyor.
7. **Mobile route guard yok iddiası yanlış.** `apps/mobile/src/app/student/_layout.tsx:35-91`, `apps/mobile/src/app/business/_layout.tsx:36-99`, `apps/mobile/src/app/club/_layout.tsx:37-95` authenticated/role-based redirects içeriyor.

## Platform Readiness Matrix

| Platform | Karar | Neden |
|---|---|---|
| iOS App Store | **BLOCKED** | Sign in with Apple/eşdeğer login yok, store audit fail, fiziksel store build smoke tamamlanmamış. |
| Google Play Store | **BLOCKED** | Store audit fail, Android real-device Google OAuth + remote push smoke eksik, accessibility touch target riskleri var. |
| Web production cutover | **BLOCKED for public cutover** | Dirty worktree, hosted credential smoke/custom domain cutover kanıtı eksik, accessibility focus issues, destructive scripts/default prod ref riski. |
| Private hosted pilot | **CONDITIONAL** | Runbook'taki sınırlı pilot yolu mümkün olabilir; iPhone path kısmen kanıtlı, Android remote push ve real operator credentials hala owner action. |

## Öncelikli Kapanış Planı

1. Dirty worktree'i release candidate branch/commit/tag haline getirin; deploy sadece tag'den olsun.
2. `audit:store-release-readiness` ve `audit:realtime-readiness` fail nedenlerini kapatın; root `qa:mobile-store-release-readiness` yeşil olsun.
3. Sign in with Apple veya geçerli exemption kararını kapatın; iOS fiziksel cihazda doğrulayın.
4. Android real-device smoke: Google OAuth native callback, remote push receipt/open, scanner camera/location, notification icon/channel.
5. Deno ve Supabase local/linked DB gates: Edge Function typecheck, DB lint/diff, hosted migrations/functions parity.
6. Destructive script guard'ları ve production project ref default'unu düzeltin.
7. Accessibility P1'leri kapatın: touch target >=44/48, focus-visible, screen reader disabled state.
8. Admin/organizer mutation rate limit + scanner PIN lockout ekleyin.
9. Seed production guard ve storage public media policy kararını kapatın.
10. Performance ve test stratejisini public launch öncesi minimum seviyeye getirin: bundle budget, event pagination, announcement recipient DB batching, QR/scan/reward/RLS integration tests.

## Son Karar

Bu workspace şu an **public production release için hazır değil**. Teknik temel iyi, ancak release gate'lerin kırık olması, store policy boşluğu, fiziksel cihaz doğrulama eksikleri ve deployment traceability sorunu public launch riskini yüksek yapıyor.

Bir sonraki mantıklı hedef: temiz bir release candidate branch/tag oluşturmak, iki kırık mobile audit'i yeşile almak, iOS/Android fiziksel cihaz smoke'u tamamlamak ve hosted Supabase parity'yi read-only kanıtlarla belgelemek.
