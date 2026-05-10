# Production Test Checklist

Bu dosya App Store, Google Play ve web production cutover oncesi tek tek isaretlenecek son test listesidir. Her madde gercek hesaplarla, mumkunse iki fiziksel telefonla, production veya production-benzeri hosted Supabase uzerinde yapilmalidir.

`[EXTERNAL]` ile isaretlenen maddeler repo icinden tamamlanamaz; cihaz, store console, Apple/Google/Supabase/Vercel hesap ayari veya owner credential islemi gerektirir. Isaretlenmeyen maddeler repo komutlari, hosted smoke veya mevcut fixture'larla dogrulanabilir.

## 0. Release Gate

- [ ] Temiz release branch/commit/tag hazir.
- [ ] Hosted Supabase migration history ve repo migration dosyalari karsilastirildi.
- [ ] Supabase Edge Functions production version listesi kontrol edildi ve `supabase/functions/*` envanteri `supabase/config.toml` + `docs/EDGE_FUNCTIONS.md` ile eslesti.
- [ ] Vercel production deploy `READY` ve `https://omaleima.fi` alias dogru.
- [ ] `npm --prefix apps/admin run typecheck` gecti.
- [ ] `npm --prefix apps/admin run lint` gecti.
- [ ] `npm --prefix apps/admin run build` gecti.
- [ ] `npm --prefix apps/mobile run typecheck` gecti.
- [ ] `npm --prefix apps/mobile run lint` gecti.
- [ ] `npm --prefix apps/mobile run export:web` gecti.
- [ ] `npm --prefix apps/mobile run smoke:club-event-rpc` organizer event create/edit-save RPC smoke gecti.
- [ ] `npm --prefix apps/mobile run audit:web-bundle-budget` gecti.
- [ ] `npm --prefix apps/mobile run audit:store-release-readiness` gecti.
- [ ] [EXTERNAL] `npm run qa:mobile-native-simulator-smoke` Android emulator ve iOS simulator executable launch-smoke dahil gecti.
- [ ] [EXTERNAL] `npm --prefix apps/mobile run smoke:native-simulators` direct repeat gerekirse Android emulator ve iOS simulator icin gecti.
- [ ] Native simulator smoke icin root entrypoint `npm run qa:mobile-native-simulator-smoke`; prefix komut ayni gate'i dogrudan tekrar calistirmak icindir.
- [ ] `npm --prefix apps/mobile run audit:hosted-business-scan-readiness` gecti.
- [ ] `npm --prefix apps/mobile run audit:native-push-device-readiness` gecti.
- [ ] `npm --prefix apps/mobile run audit:realtime-readiness` gecti.
- [ ] `npm --prefix apps/mobile run audit:reward-notification-bridge` gecti.
- [ ] Hosted `mobile_release_requirements` minimum supported version/build rows kontrol edildi.
- [ ] Eski/stale build testinde update-required ekranı uygulamayı blokluyor.
- [ ] [EXTERNAL] iOS dev/preview/store build yeni native dependency graph ile yeniden alindi.
- [ ] [EXTERNAL] Android dev/preview/store build yeni native dependency graph ile yeniden alindi.
- [ ] Mobile edge security boundary kontrol edildi: Cloudflare web WAF sadece web domainini koruyor; mobil direkt Supabase Auth/RLS/Edge Functions/Storage kontrolleri production'da aktif.
- [ ] Private `media-staging` bucket production'da private, event/announcement draft gorselleri staging path + signed URL ile gorunuyor, publish sonrasi public copy olusuyor ve staging temizleniyor.
- [ ] Supabase Pro plan + Custom Domain add-on final launch asamasinda aktif edildi; bu maliyet App Store/Google Play/production web submission hazir olana kadar ertelendi.
- [ ] Supabase Custom Domain cutover tamamlandi: Google OAuth callback, `NEXT_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, Edge Function URLs ve Storage public URLs `api.omaleima.fi` gibi markali Supabase hostname'i uzerinden calisiyor.
- [ ] City scope smoke tamamlandi: student local-city events first siralaniyor, business baska sehir eventine katilamiyor, organizer kendi club city disinda event create/update edemiyor.

## 1. Web Public Site

- [ ] `/`, `/en`, `/apply`, `/en/apply`, `/contact`, `/en/contact`, `/privacy`, `/terms` aciliyor.
- [ ] Cookie banner `Hyvaksy kaikki / Accept all` calisiyor ve tekrar gorunmuyor.
- [ ] Cookie preferences tekrar acilip degistirilebiliyor.
- [ ] Apply form basarili gonderimde basari mesaji gosteriyor, hatali basari/hata karmasi yok.
- [ ] Contact form basarili gonderimde basari mesaji gosteriyor ve form temizleniyor.
- [ ] SEO metadata, sitemap ve robots production URL ile dogru.
- [ ] Public images 404 vermiyor.

## 2. Admin Web Panel

- [ ] Admin email/password login calisiyor.
- [ ] Google login admin panelde yok.
- [ ] Terms, privacy, support/contact ve Instagram linkleri login ekraninda calisiyor.
- [ ] Dil degisimi admin sayfalari arasinda kalici.
- [ ] Dashboard kartlari uzun metin/resim ile tasma yapmiyor.
- [ ] `/admin/business-applications` basvuru onay/reddet calisiyor.
- [ ] Manual business account create formu owner name, email, password, y-tunnus ve business alanlarini dogru kaydediyor.
- [ ] Manual organization account create formu owner ve organization alanlarini dogru kaydediyor.
- [ ] `/admin/users` search, filter, pagination calisiyor.
- [ ] User active/passive yapinca kullanici realtime cikis aliyor.
- [ ] Delete/anonymize account flow dogru onay istiyor ve geri alinmaz oldugunu belli ediyor.
- [ ] `/admin/support-requests` mobile support mesajlarini listeliyor, cevap gonderiyor ve push tetikliyor.
- [ ] `/admin/contact-submissions` pagination calisiyor.
- [ ] `/admin/department-tags` merge/block calisiyor.
- [ ] `/admin/login-slides` mobil login sliderlarini FI/EN copy ile yonetiyor.
- [ ] Announcement create/update/delete/push calisiyor; delete sonrasi owned image bucket objesi temizleniyor.
- [ ] Admin mutation rate limit spam denemesinde `429` ve `Retry-After` donuyor.

## 3. Organizer Web Panel

- [ ] Organizer email/password login calisiyor.
- [ ] Dil degisimi club sayfalari arasinda kalici.
- [ ] `/club/events` create, edit, cancel, delete/safe delete akislari calisiyor.
- [ ] Ticket URL kaydediliyor ve student event detailde dogru gorunuyor.
- [ ] Event cover upload yeni gorseli gosteriyor ve eski owned gorsel temizleniyor.
- [ ] `/club/claims` active/completed eventleri listeliyor ve reward claim confirm calisiyor.
- [ ] `/club/rewards` create/update/delete calisiyor.
- [ ] `/club/announcements` create/update/delete/push calisiyor.
- [ ] `/club/reports` metrikleri dogru eventlere gore gosteriyor.
- [ ] `/club/profile` phone, address, website, Instagram ve images kaydediyor.
- [ ] Fraud review listesi gercek signal durumlarini gosteriyor ve review action calisiyor.

## 4. Student Mobile

- [ ] Google ile ilk giris calisiyor.
- [ ] Privacy/data popup ilk giriste bir kez gorunuyor.
- [ ] Language dropdown tum profil sayfalariyla ayni tasarimda.
- [ ] Event list pull-to-refresh yeni eventleri gosteriyor.
- [ ] Event detail uzun metinlerde scroll oluyor.
- [ ] Event detail reward/palkinto ust kisimdaki gift action ile popup aciyor.
- [ ] Ticket URL varsa CTA calisiyor.
- [ ] Event registration ve cancel davranisi dogru.
- [ ] Oma QR event secimi kullanicinin sectigi eventte kaliyor.
- [ ] QR yuzunde screenshot/screen recording protection aktif.
- [ ] Leima karti yuzunde screenshot/share/save serbest.
- [ ] Share card QR token icermeyen OmaLeima tasarimi paylasiyor.
- [ ] Save to Photos izin kabul ve izin reddi davranislari dogru.
- [ ] Scan sonrasi leima sayisi, reward unlock ve leaderboard guncelleniyor.
- [ ] Stamp card full oldugunda yeni scan kabul edilmiyor.
- [ ] Community/Yhteiso kulup detail popup kendi icinde scroll oluyor.
- [ ] Club email/phone/website/Instagram linkleri calisiyor.
- [ ] Announcements push bildirimi app kapaliyken geliyor ve detail route'a yonlendiriyor.

## 5. Business / Scanner Mobile

- [ ] Business owner email/password login calisiyor.
- [ ] Scanner-only hesap kamera ekranina direkt gidiyor.
- [ ] Business home profil butonu kaldirilmis.
- [ ] Business event detail uzun metinlerde scroll oluyor.
- [ ] Joined event selector iki aktif event varsa scan oncesi dogru event sectiriyor.
- [ ] Student Event A QR'i Business Event B contextinde `EVENT_CONTEXT_MISMATCH` donuyor ve leima yazmiyor.
- [ ] Basarili scan ses/haptic feedback veriyor.
- [ ] Invalid/already stamped/full card sonucunda danger/warning feedback veriyor.
- [ ] 5 yanlis scanner PIN denemesi `SCANNER_PIN_LOCKED` gosteriyor.
- [ ] PIN lock suresince scan reddediliyor.
- [ ] Lock suresi bitince dogru PIN ile scan calisiyor ve counters resetleniyor.
- [ ] Scan history anlik guncelleniyor.
- [ ] Business ROI report FI/EN copy ve metrikleri dogru.
- [ ] Business onboarding popup ilk giriste gorunuyor, profilden tekrar aciliyor.
- [ ] Business profile image upload eski owned image'i temizliyor.

## 6. Organizer Mobile

- [ ] Organizer login calisiyor.
- [ ] Profile sayfasinda sign out butonu calisiyor.
- [ ] Profile phone/address/web/social alanlari web ile tutarli.
- [ ] Events ekraninda evente tiklayinca edit, cancel ve delete aksiyonlari gorunuyor.
- [ ] Upcoming -> edit dogru event formunu acar, sadece events sayfasina bos yonlendirme yapmaz.
- [ ] Event create/update/delete gorsel upload ve eski image cleanup ile calisiyor.
- [ ] Organizer event edit/save icin repo RPC smoke gecti; fiziksel staging build ile UI tap-through ayrica dogrulandi.
- [ ] Announcements create/update/delete gorsel cleanup ile calisiyor.
- [ ] Reports ekrani business ROI kalitesinde ve localized.
- [ ] Claims/reward handoff mobile organizer tarafinda dogru.

## 7. Store Compliance

- [ ] iOS app icon default Expo degil, OmaLeima.
- [ ] Android app icon default Expo degil, OmaLeima.
- [ ] Android notification small icon OmaLeima monochrome.
- [ ] iOS notification banner app icon dogru.
- [ ] App Store privacy nutrition labels backend/storage/push/camera/media izinleriyle tutarli.
- [ ] Google Play Data Safety formu backend/storage/push/camera/media izinleriyle tutarli.
- [ ] Google-only login icin Apple Sign in with Apple exemption karari yazili olarak verildi veya Sign in with Apple eklendi.
- [ ] Camera, Photos, Notifications ve Location permission copy'leri store review icin acik.

## 8. Final Data / Cutover

- [ ] Demo/screenshot data temizlendi veya production reset plani uygulandi.
- [ ] Sadece gercek admin hesabi birakildi.
- [ ] Seed/destructive scripts production ref icin explicit confirmation olmadan calismiyor.
- [ ] Public media draft strategy karari uygulandi veya pilot kisitiyla runbook'a yazildi.
- [ ] Public bucketlarda draft event/announcement gorseli kalmadigi spot kontrol edildi.
- [ ] Support, contact, privacy ve terms linkleri web ve mobile icinde dogru.
