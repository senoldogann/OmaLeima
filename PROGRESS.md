# Proje İlerleme Takibi (Progress Tracker)

Bu dosya Digital Leima projesinin tüm ince detaylarını, fazların alt görevlerini ve merge edilen PR'ları takip etmek için kullanılır. AI Ajanları, görevlerini `LEIMA_APP_MASTER_PLAN.md` içerisindeki mimariye uygun olarak eksiksiz tamamladıktan sonra burayı güncellemekle yükümlüdür. Diğer ajanlar kod yazmaya başlamadan önce bu dosyayı okuyarak projenin mevcut durumunu analiz etmelidir.

## Son Ajan Devri (Latest Agent Handoff)

- **Tarih:** 2026-04-28
- **Branch:** `feature/admin-platform-oversight`
- **Yapılan iş:** Faz 5 system-admin oversight yüzeyi tamamlandı. `apps/admin` altında yeni `/admin/oversight` route’u eklendi; platform genelindeki kulüpler, yaklaşan veya aktif bitmemiş operasyonel etkinlikler, audit loglar ve açık fraud sinyalleri SSR read-model ile admin panelde gösteriliyor. Admin navigation genişletildi ve bounded latest-list mantığıyla operasyon ekranı eklendi. Audit metadata ve fraud metadata doğrudan ham JSON dökmek yerine kısa summary satırlarına normalize edildi. Yeni `smoke:oversight` script’i Docker-backed local DB fixture seed ile `audit_logs`, açık/reviewed `fraud_signals` ve görünür/gizli event fixture’ları üretip admin görünürlüğü, organizer audit RLS gizliliği, organizer event-scoped fraud görünürlüğü ve route render doğrulaması yapıyor.
- **Neden yapıldı:** Business application review tamamlandıktan sonra Faz 5’te sıradaki doğru küçük adım, platform admin’in yalnızca başvuru kuyruğunu değil sistem sağlığını da tek ekrandan görmesiydi. Bu slice, fraud ve audit yüzeyini görünür kılarak sonraki moderasyon ve CI/RLS genişletmeleri için temel oluşturdu.
- **Doğrulama:** `rtk supabase db reset` sonrası `apps/admin` içinde `npm run lint`, `npm run typecheck`, `npm run build`, sonra sequential olarak `npm run smoke:auth`, `npm run smoke:routes`, `npm run smoke:business-applications`, `npm run smoke:oversight` geçti. `smoke:routes` seeded admin için `/admin/oversight -> 200`, organizer için `/admin/oversight -> 307 /club` doğruladı. `smoke:oversight` `admin-audit-read:1`, `organizer-audit-read:0`, `admin-fraud-read:1`, `organizer-fraud-read:1`, `admin-oversight-route:ok`, `organizer-oversight-redirect:/club` çıktılarıyla tamamlandı; ayrıca route HTML içinde reviewed fraud fixture’ının ve bitmiş event fixture’ının görünmediği kontrol edildi. Route check ayrıca `http://localhost:3001/login -> 200` ve anon `http://localhost:3001/admin/oversight -> 307 /login` olarak alındı.
- **Sıradaki önerilen adım:** Yeni temiz branch ile Faz 5’in sonraki sistem-admin modülüne geç: `feature/admin-department-tag-moderation` ile duplicate/custom department tag merge ve block akışını web panele bağla.
- **Açık risk/blokaj:** Merkezi repo CI hâlâ zayıf; admin smoke’lar app-local durumda. Oversight read yüzeyi hazır ama gerçek browser click-path e2e ve daha geniş regression matrisi henüz yok. Event-day concurrency stres, load test ve GTM/deploy runbook işleri hâlâ Faz 6 tarafında bekliyor.

- **Tarih:** 2026-04-28
- **Branch:** `feature/admin-business-applications-review`
- **Yapılan iş:** Faz 5’in ilk gerçek admin modülü tamamlandı. `apps/admin` altında yeni `/admin/business-applications` route’u eklendi; pending ve recently reviewed `business_applications` kayıtları SSR Supabase client ile okunuyor. Admin shell navigation genişletildi ve pending queue pagination geldi. Platform admin artık bu ekrandan app-local review API route’ları üzerinden `admin-approve-business` ve `admin-reject-business` Edge Function’larını kullanarak başvuruları onaylayıp reddedebiliyor. Reject flow boş reason’ı UI seviyesinde ve route validation tarafında durduruyor; tampered `applicationId` erken reddediliyor; stale review durumları için backend status mesajları inline gösteriliyor. Untrusted website/Instagram URL’leri yalnızca `http/https` ise render ediliyor. Ayrıca `smoke:business-applications` script’i route-backed review boundary’yi ve admin queue read, organizer/student RLS görünmezliği, approve success, reject success, duplicate approve, blank reject, invalid UUID ve organizer not-allowed durumlarını gerçek local stack üstünde doğruluyor.
- **Neden yapıldı:** Admin app foundation kurulduktan sonra Faz 5’te en doğru küçük adım, ürünün gerçekten iş yapan ilk platform-admin operasyon yüzeyini açmaktı. Pending mekan başvurusu review akışı hem ürün operasyonu hem de Phase 5’in geri kalan admin modülleri için auth, RLS ve mutation modelini netleştiriyor.
- **Doğrulama:** `rtk supabase db reset` sonrası `apps/admin` içinde `npm run lint`, `npm run typecheck`, `npm run build`, `npm run smoke:auth`, `npm run smoke:routes`, `npm run smoke:business-applications` geçti. `smoke:routes` seeded admin için `/admin/business-applications -> 200`, organizer için `/admin/business-applications -> 307 /club` doğruladı. `smoke:business-applications` `admin-read:21`, `organizer-read:0`, `student-read:0`, `admin-route-content:ok`, `admin-route-unsafe-url-hidden:ok`, `admin-route-page-2:ok`, `approve:SUCCESS`, `reject:SUCCESS`, `duplicate-approve:APPLICATION_NOT_PENDING`, `blank-reject:VALIDATION_ERROR`, `invalid-approve:VALIDATION_ERROR`, `organizer-approve:ADMIN_NOT_ALLOWED`, `state-check:ok` çıktılarıyla tamamlandı. Route check ayrıca `http://localhost:3001/login -> 200` ve anon `http://localhost:3001/admin/business-applications -> 307 /login` olarak alındı.
- **Sıradaki önerilen adım:** Yeni temiz branch ile Faz 5’in sıradaki sistem admin dilimine geç: platform genelinde kulüpler, etkinlikler, audit logs ve fraud sinyallerini izleyen `feature/admin-platform-oversight` benzeri bir slice aç. Bu modül, mevcut admin shell ve RLS smoke yaklaşımını genişletmeli.
- **Açık risk/blokaj:** Merkezi repo CI hâlâ zayıf; admin smoke’lar app-local durumda. Route-backed mutation boundary şimdi script ile doğrulanıyor ama gerçek browser click-path e2e hâlâ ayrı bir kalite katmanı olarak duruyor. Concurrency stress, event-day load testleri ve daha kapsamlı RLS regression matrisi hâlâ Faz 6 işi olarak duruyor. GTM tarafında deploy runbook, analytics, domain ve launch checklist henüz ayrı dilimde tamamlanmadı.

- **Tarih:** 2026-04-28
- **Branch:** `feature/admin-web-foundation`
- **Yapılan iş:** Faz 5 web foundation tamamlandı. Yeni `apps/admin` Next.js App Router uygulaması kuruldu; strict env parsing, Supabase SSR browser/server/proxy client’ları, `/login`, `/admin`, `/club`, `/forbidden` route’ları, role-based root redirect ve sign-out akışı eklendi. Club erişimi artık yalnızca `primary_role` değil aktif `club_members` + aktif `clubs` kontrolüyle açılıyor. Ayrıca `smoke:auth` ve gerçek cookie/redirect davranışını vuran `smoke:routes` script’leri eklendi.
- **Neden yapıldı:** Faz 4 tamamlandıktan sonra en doğru küçük adım, admin ve club panel için ikinci uygulama yüzeyini gerçekten ayağa kaldırmaktı. Faz 5 modüllerine geçmeden önce auth gate, SSR session refresh ve role routing’in sağlam olması gerekiyordu. Aynı anda CI/smoke disiplini zayıf kalmasın diye app-local smoke harness de bu dilime alındı.
- **Doğrulama:** `apps/admin` içinde `npm run lint`, `npm run typecheck`, `npm run build`, `npm run smoke:auth` ve `npm run smoke:routes` geçti. `smoke:auth` seeded `admin`, `organizer`, `student` hesapları için `admin`, `club`, `unsupported` alan çözümünü doğruladı. `smoke:routes` çalışan local Next dev server üstünde `admin -> /admin 200`, `organizer -> /club 200`, `organizer -> /admin 307 /club`, `student -> /admin 307 /forbidden` davranışını doğruladı. Route check ayrıca `http://localhost:3001/login`, `http://localhost:3001/admin`, `http://localhost:3001/club` üzerinden alındı. Playwright ile login ekranı açıldı ve konsolda yalnızca normal dev logları görüldü.
- **Sıradaki önerilen adım:** Yeni temiz branch ile `feature/admin-business-applications-review` aç. Platform admin için bekleyen mekan başvurularını listeleme ve `admin-approve-business` / `admin-reject-business` akışını web paneline bağlamak Faz 5’in doğru bir sonraki dilimi.
- **Açık risk/blokaj:** Google OAuth’un gerçek hosted roundtrip’i Supabase dashboard redirect allow-list ile ayrıca doğrulanmalı. Repo seviyesinde merkezi CI, daha sıkı RLS regression smoke, concurrency stress ve load-test harness’leri hâlâ Faz 6 işi olarak duruyor. GTM tarafında deploy runbook, domain, analytics ve launch checklist henüz ayrı bir dilimde belgelenmedi.

## Faz 0: Planlama ve Kurallar
- [x] Ana mimari ve master planın oluşturulması (`LEIMA_APP_MASTER_PLAN.md`)
- [x] AI ajanları için kesin geliştirme kurallarının belirlenmesi (`AGENTS.md`)
- [x] İlerleme takip dosyasının detaylı alt fazlarla oluşturulması (`PROGRESS.md`)

## Faz 1: Veritabanı ve Temel Altyapı (Database Agent)
- [x] Profil (`profiles`), Kulüp (`clubs`) ve Mekan (`businesses`) tablolarının oluşturulması
- [x] Etkinlik (`events`), Mekan Katılımı (`event_venues`) ve Öğrenci Kayıt (`event_registrations`) tablolarının oluşturulması
- [x] QR Kullanım (`qr_token_uses`) ve Damga/Leima (`stamps`) tablolarının oluşturulması
- [x] Leaderboard (`leaderboard_scores`) ve Ödül (`reward_tiers`, `reward_claims`) tablolarının oluşturulması
- [x] Bildirim (`notifications`) ve Fraud/Güvenlik (`fraud_signals`, `audit_logs`) tablolarının oluşturulması
- [x] Tüm tablolara özel Foreign Key ve veri bütünlüğü için Unique Constraint'lerin eklenmesi
- [x] İlgili Index'lerin (Performans iyileştirmeleri) oluşturulması
- [x] Row Level Security (RLS) politikalarının (Güvenlik matrisine uygun şekilde) yazılması
- [x] Atomik Damga İşlemi: `scan_stamp_atomic` RPC (Remote Procedure Call) fonksiyonunun kodlanması
- [x] Puan Tablosu: Skor hesaplama (asenkron periyodik) ve listeleme (`get_event_leaderboard`) RPC'lerinin kodlanması
- [x] Ödül talep (`claim_reward_atomic`) RPC fonksiyonunun kodlanması
- [x] Test senaryoları için `seed.sql` başlangıç veri dosyasının hazırlanması

## Faz 2: Edge Functions, Güvenlik ve API Mantığı (Security/QR Agent)
- [x] Proje genelinde kullanılacak TypeScript tiplerinin (Shared Types) oluşturulması
- [x] `generate-qr-token` API'sinin yazılması (Maksimum katılımcı kontrolü ve JWT imzalaması dahil)
- [x] `scan-qr` API'sinin yazılması (Zaman aşımı, tekrar kullanımı engelleme ve mekan doğrulama)
- [x] `claim-reward` API'sinin yazılması
- [x] `admin-approve-business` ve `admin-reject-business` API'lerinin yazılması
- [x] `register-device-token` ve `send-push-notification` API'lerinin yazılması
- [x] Periyodik (Cron) çalışan asenkron Edge Functions (Leaderboard toplu güncelleme, etkinlik hatırlatmaları)

## Faz 3: Mobil Uygulama MVP - Öğrenci Akışı (Mobile Student Agent)
- [x] Expo projesinin başlatılması, klasör yapısı (app, src/features) ve kütüphanelerin kurulumu
- [x] Supabase Auth ile Google Login entegrasyonunun sağlanması
- [x] Global State (Örn: Zustand/Tanstack Query) ve Supabase Client bağlantısının kurulması
- [x] Öğrenci Ana Ekran: Yaklaşan/Aktif etkinliklerin listelenmesi
- [x] Etkinlik Detay Ekranı ve kapasite kurallı "Etkinliğe Katıl" işleminin arayüzü
- [x] Öğrenci QR Ekranı: Dinamik, 30 saniyede bir yenilenen, ekran kaydı uyarılı QR kod gösterimi
- [x] Leima (Damga) Ekranı: Anlık toplanan leimaların ve ödül kazanım ilerlemesinin gösterimi
- [x] Leaderboard Ekranı: Top 10 ve kullanıcının kendi sıralamasının gösterimi
- [x] Öğrenci Profil Ekranı: Opsiyonel department tag seçimi, custom tag ekleme ve primary tag belirleme
- [x] Push Notifications: Bildirim izinlerinin alınması ve Expo Push Token entegrasyonu

## Faz 4: Mobil Uygulama - Mekan ve Tarayıcı Akışı (Mobile Business Agent)
- [x] Mekan Personeli (Business Staff) için email/şifre giriş ekranı
- [x] Mekan Ana Ekran: Katılınabilecek yaklaşan etkinlikler ve başlama saati öncesi katılma işlemleri
- [x] Kamera Tarayıcı (Scanner) Ekranı: UI tasarımı ve barkod okuma entegrasyonu
- [x] Tarama İsteği: `scan-qr` servisine istek atılması ve 4 saniyelik "Timeout / Zayıf İnternet" kontrolü
- [x] Tarama Sonuç Ekranları: Başarılı (Yeşil), Zaten Okutuldu (Sarı), Hatalı/Süresi Dolmuş (Kırmızı)
- [x] Tarayıcı Kilidi: Hızlı ardışık okutmayı engellemek için kameranın işlem bitene kadar dondurulması (Debounce)
- [x] Geçmiş Ekranı: Mekan görevlisinin kendi okuttuğu leimaları görebileceği anlık liste

## Faz 5: Admin ve Kulüp Paneli (Admin/Club Panel Agent)
- [x] Next.js (App Router) projesinin başlatılması ve temel layout kurulumu
- [x] Admin/Kulüp giriş ekranı ve yetkiye (role) bağlı yönlendirme mekanizması (Supabase Auth)
- [x] **Sistem Admini Modülü:** Bekleyen mekan başvurularını inceleme ve onaylama/reddetme
- [x] **Sistem Admini Modülü:** Platformdaki tüm kulüpleri, etkinlikleri ve Fraud (Sahtekarlık) sinyallerini izleme
- [ ] **Sistem Admini Modülü:** Duplicate/custom department tag'leri birleştirme ve moderasyon
- [ ] **Kulüp Yetkilisi Modülü:** Yeni etkinlik oluşturma (Tarih, şehir, kapasite, kurallar)
- [ ] **Kulüp Yetkilisi Modülü:** Etkinlik ödül seviyelerinin (Reward Tiers) eklenmesi ve stok takibi
- [ ] **Kulüp Yetkilisi Modülü:** Topluluk için official department tag önerme/oluşturma
- [ ] **Kulüp Yetkilisi Modülü:** Ödül Dağıtım Ekranı (Öğrencinin hak kazandığı ödülü teslim etmek için doğrulama)

## Faz 6: Kalite Güvencesi (QA) ve Canlıya Geçiş (QA Agent)
- [ ] Kritik güvenlik testi: Geçersiz JWT, başka etkinliğin QR'ı, süresi dolmuş JWT denemeleri
- [ ] Race Condition testi: Aynı öğrenciyi eşzamanlı iki farklı telefondan okutma denemesi
- [ ] RLS testi: Kötü niyetli bir öğrencinin başkasının stamps tablosunu doğrudan okumaya/yazmaya çalışması
- [ ] Performans testi: Asenkron Leaderboard yapısının veritabanını kilitlemeden çalıştığının doğrulanması
- [ ] Master Plan Bölüm 29: "Event Day Checklist" (Etkinlik Günü Kontrol Listesi) üstünden geçilmesi
- [ ] Manuel Fallback (Çevrimdışı Liste) senaryosunun belgelenmesi ve görevlilere verilecek formatın hazırlanması

---
### Tamamlanan Görevler (Changelog)
- *2026-04-28*: Faz 3 student QR screen tamamlandı; active-event tabı canlı registered-event selection, backend-timed QR refresh, capture warning ve progress summary göstermeye başladı.
- *2026-04-28*: Faz 3 student reward progress tamamlandı; rewards tabı gerçek reward tier state gösteriyor ve active-event QR ekranı ile shared reward progress surface kullanıyor.
- *2026-04-28*: Faz 3 student leaderboard tamamlandı; event-scoped Top 10 ve current-user rank görünürlüğü `student/leaderboard` tabına bağlandı.
- *2026-04-28*: Faz 3 mobile push registration tamamlandı; student profile tabı native permission + Expo token + backend device-token enrollment akışına bağlandı.
- *2026-04-28*: Faz 3 department tag schema foundation tamamlandı; `department_tags` ve `profile_department_tags` tabloları, RLS politikaları, seeded local örnekler ve max 3 / max 1 primary kuralları eklendi.
- *2026-04-28*: Faz 3 student profile tags tamamlandı; `student/profile` gerçek department tag selection, custom create, primary switch ve remove akışına bağlandı.
- *2026-04-28*: Faz 4 business scan history and leave flow tamamlandı; `leave_business_event_atomic`, `business/history`, joined-upcoming leave action ve daha açık scanner result-state yüzeyleri eklendi.
- *2026-04-28*: Faz 5 admin web foundation tamamlandı; `apps/admin` Next.js paneli, SSR auth gate, role-based redirects ve app-local auth plus route smoke script’leri eklendi.
- *2026-04-28*: Faz 5 admin business applications review tamamlandı; `/admin/business-applications`, SSR queue read, approve/reject action bağlama ve `smoke:business-applications` eklendi.
- *2026-04-28*: Faz 5 admin platform oversight tamamlandı; `/admin/oversight`, clubs/events/audit/fraud read-model’i ve `smoke:oversight` eklendi.
- *2026-04-28*: Faz 4 business join and scanner foundation tamamlandı; `join_business_event_atomic`, `business/events`, `business/scanner`, camera permission, manual QR fallback ve 4 saniye timeout sonucu eklendi.
- *2026-04-28*: Faz 4 business auth and home foundation tamamlandı; ortak auth entry student/business ayrımı yapacak şekilde genişletildi ve yeni `business/home` route'u aktif staff membership ile joined event context göstermeye başladı.
- *2026-04-28*: Faz 3 event detail ve secure join flow tamamlandı; nested student event route, `register_event_atomic` RPC ve `generate-qr-token` registration alignment eklendi.
- *2026-04-28*: Faz 3 öğrenci event discovery listesi tamamlandı; `student/events` gerçek Supabase event ve registration verisini loading/error/empty/content durumlarıyla göstermeye başladı.
- *2026-04-28*: Faz 3 Google auth client flow eklendi; `auth/callback`, student route guard ve sign-out path hazırlandı, session storage `expo-secure-store` tabanına taşındı.
- *2026-04-28*: Faz 3 mobile foundation tamamlandı; `apps/mobile` Expo shell'i, Supabase client/session provider, React Query provider ve push preparation helper eklendi.
- *2026-04-27*: Faz 2 admin business approval flow tamamlandı; business review RPC'leri ve `admin-approve-business` / `admin-reject-business` Edge Function'ları eklendi.
- *2026-04-28*: Faz 2 controlled push endpoint tamamlandı; `send-push-notification` eklendi ve `PROMOTION` anti-spam rule smoke testleri geçti.
- *2026-04-27*: Faz 2 leaderboard refresh cron job tamamlandı; `scheduled-leaderboard-refresh` eklendi ve async leaderboard smoke testleri geçti.
- *2026-04-27*: Faz 2 scheduled reminder cron foundation tamamlandı; `scheduled-event-reminders`, Expo batch/retry helper ve reminder query index'leri eklendi, local cron smoke testleri geçti.
- *2026-04-27*: Faz 2 push foundation tamamlandı; shared Expo push helper ile `register-device-token` ve `send-test-push` Edge Function'ları eklendi, local push smoke testleri geçti.
- *2026-04-27*: Öğrenci department tag desteği ürün planına eklendi; optional profile tags, official/custom sources ve duplicate merge yaklaşımı roadmap'e işlendi.
- *2026-04-27*: Faz 2 reward claim Edge Function tamamlandı; `claim-reward` eklendi ve local reward smoke testleri geçti.
- *2026-04-27*: Faz 2 QR Edge Function ilk dilimi tamamlandı; `generate-qr-token` ve `scan-qr` eklendi, local auth/DB/function smoke testleri geçti.
- *2026-04-27*: Ajan çalışma disiplini güçlendirildi; `REVIEW.md`, `PLAN.md`, `TODOS.md` zorunlu pre-implementation çalışma dosyaları olarak eklendi.
- *2026-04-27*: Ürün konumlandırması "Digital leima pass for Finnish student overalls events" olarak netleştirildi. Faz 1 Supabase database foundation tamamlandı; local migration/seed ve RPC smoke testleri geçti.
- *2026-04-26*: Ana mimari planlama, kural dosyaları (`AGENTS.md`) ve detaylı proje takip listesi (`PROGRESS.md`) mükemmeliyet odaklı oluşturuldu. Faz 0 tamamlandı.
