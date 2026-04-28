# Proje İlerleme Takibi (Progress Tracker)

Bu dosya Digital Leima projesinin tüm ince detaylarını, fazların alt görevlerini ve merge edilen PR'ları takip etmek için kullanılır. AI Ajanları, görevlerini `LEIMA_APP_MASTER_PLAN.md` içerisindeki mimariye uygun olarak eksiksiz tamamladıktan sonra burayı güncellemekle yükümlüdür. Diğer ajanlar kod yazmaya başlamadan önce bu dosyayı okuyarak projenin mevcut durumunu analiz etmelidir.

## Son Ajan Devri (Latest Agent Handoff)

- **Tarih:** 2026-04-28
- **Branch:** `feature/mobile-business-scan-history-and-leave-flow`
- **Yapılan iş:** Faz 4 business akışı kapatıldı. Yeni `leave_business_event_atomic` RPC ile business staff artık yalnızca etkinlik başlamadan önce joined venue kaydını bırakabiliyor. Mobil tarafta yeni `business/history` route'u eklendi; `business/home`, `business/events` ve `business/scanner` bu ekrana CTA veriyor. `business/events` joined upcoming event kartlarında leave action aldı. `business/scanner` result-state yüzeyleri daha açık hale getirildi; status code, operator guidance ve history deep-link eklendi.
- **Neden yapıldı:** Bir önceki dilim business tarafını join ve live scan seviyesine getirmişti, ama Faz 4 acceptance hâlâ eksikti: leave-before-start kuralı, operatörün kendi scan geçmişi ve daha net result-state yüzeyleri. Bu dilim Phase 4 checklist'ini tamamlamak için yapıldı.
- **Doğrulama:** `apps/mobile` içinde `npm run lint`, `npm run typecheck` ve `npm run export:web` geçti. `supabase db reset` sonrası auth-backed smoke ile `leave_business_event_atomic` için `SUCCESS`, tekrar çağrıda `VENUE_ALREADY_LEFT`, active event için `EVENT_LEAVE_CLOSED` doğrulandı. Scanner user scope ile history query `REVOKED`, `MANUAL_REVIEW`, `VALID` satırlarını doğru sırada okudu ve UI'nin kullandığı masked student labels `Student ...0011`, `Student ...0010`, `Student ...0004` olarak üretildi. DB tarafında leave sonrası `event_venues.status=LEFT` ve `left_at` dolu olduğu; history fixture için validation-status dağılımı `1/1/1` olduğu doğrulandı. Test sonunda local DB tekrar seeded duruma alındı. Web preview route check `http://localhost:8096/business/events`, `http://localhost:8096/business/history` ve `http://localhost:8096/business/scanner` için `200 OK` verdi.
- **Sıradaki önerilen adım:** Yeni temiz branch ile Faz 5'e geç ve `feature/admin-web-foundation` aç. Next.js admin/kulüp paneli app shell, auth gate ve temel layout doğru ilk kırılım.
- **Açık risk/blokaj:** Camera scanner sonucu ve permission davranışı gerçek native cihazda ayrıca doğrulanmalı. Web preview ve manual smoke state machine doğruluyor ama production event-day ergonomisi için cihaz testi hâlâ gerekli.

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
- [ ] Next.js (App Router) projesinin başlatılması ve temel layout kurulumu
- [ ] Admin/Kulüp giriş ekranı ve yetkiye (role) bağlı yönlendirme mekanizması (Supabase Auth)
- [ ] **Sistem Admini Modülü:** Bekleyen mekan başvurularını inceleme ve onaylama/reddetme
- [ ] **Sistem Admini Modülü:** Platformdaki tüm kulüpleri, etkinlikleri ve Fraud (Sahtekarlık) sinyallerini izleme
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
