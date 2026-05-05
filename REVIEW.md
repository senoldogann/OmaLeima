# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

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
