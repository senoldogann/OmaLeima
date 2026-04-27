# Proje İlerleme Takibi (Progress Tracker)

Bu dosya Digital Leima projesinin tüm ince detaylarını, fazların alt görevlerini ve merge edilen PR'ları takip etmek için kullanılır. AI Ajanları, görevlerini `LEIMA_APP_MASTER_PLAN.md` içerisindeki mimariye uygun olarak eksiksiz tamamladıktan sonra burayı güncellemekle yükümlüdür. Diğer ajanlar kod yazmaya başlamadan önce bu dosyayı okuyarak projenin mevcut durumunu analiz etmelidir.

## Son Ajan Devri (Latest Agent Handoff)

- **Tarih:** 2026-04-27
- **Branch:** `feature/leaderboard-refresh-job`
- **Yapılan iş:** Faz 2 cron tarafı tamamlandı: `scheduled-leaderboard-refresh` Edge Function eklendi. Function son geçerli stamp zamanı ile `leaderboard_updates.updated_at` alanını karşılaştırıp sadece dirty event'leri buluyor ve mevcut `update_event_leaderboard` RPC'sini çağırarak refresh ediyor. Scheduled secret doğrulaması da shared helper'a alındı; `scheduled-event-reminders` aynı helper'ı kullanacak şekilde hizalandı.
- **Neden yapıldı:** Master plan gereği leaderboard aggregation scan anında değil, periyodik cron job ile yapılmalıydı. Reminder job tamamlandıktan sonra Faz 2 cron checklist'inin kalan parçası buydu.
- **Doğrulama:** `supabase db reset`; seeded student/scanner auth; `generate-qr-token` success; `scan-qr` success ile gerçek stamp üretimi; `scheduled-leaderboard-refresh` invalid secret -> `UNAUTHORIZED`; valid secret -> `updatedEvents=1`; ikinci run -> `skippedAlreadyFresh=1`. DB üzerinden `leaderboard_scores` içinde `EVENT|event_id|student_id|1` ve `leaderboard_updates` içinde `version=1` doğrulandı. Shared helper regression için `scheduled-event-reminders` invalid secret ve zero-due success çağrıları da geçti.
- **Sıradaki önerilen adım:** Bu branch merge edildikten sonra Faz 2 için yeni küçük branch aç: `feature/send-push-notification` ile organizer/admin kaynaklı controlled push endpoint'i ekle ve böylece `register-device-token` + `send-push-notification` checklist maddesini kapat.
- **Açık risk/blokaj:** Scheduled job'lar hâlâ `x-scheduled-job-secret` header'ına bağlı; hosted cron kurulumunda bu secret Supabase Vault veya project secrets ile yönetilmeli. Leaderboard refresh şu an event scope için çalışıyor; weekly/monthly/yearly scope istenirse ayrı DB/RPC genişletmesi gerekecek.

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
- [ ] `register-device-token` ve `send-push-notification` API'lerinin yazılması
- [x] Periyodik (Cron) çalışan asenkron Edge Functions (Leaderboard toplu güncelleme, etkinlik hatırlatmaları)

## Faz 3: Mobil Uygulama MVP - Öğrenci Akışı (Mobile Student Agent)
- [ ] Expo projesinin başlatılması, klasör yapısı (app, src/features) ve kütüphanelerin kurulumu
- [ ] Supabase Auth ile Google Login entegrasyonunun sağlanması
- [ ] Global State (Örn: Zustand/Tanstack Query) ve Supabase Client bağlantısının kurulması
- [ ] Öğrenci Ana Ekran: Yaklaşan/Aktif etkinliklerin listelenmesi
- [ ] Etkinlik Detay Ekranı ve kapasite kurallı "Etkinliğe Katıl" işleminin arayüzü
- [ ] Öğrenci QR Ekranı: Dinamik, 30 saniyede bir yenilenen, ekran kaydı uyarılı QR kod gösterimi
- [ ] Leima (Damga) Ekranı: Anlık toplanan leimaların ve ödül kazanım ilerlemesinin gösterimi
- [ ] Leaderboard Ekranı: Top 10 ve kullanıcının kendi sıralamasının gösterimi
- [ ] Öğrenci Profil Ekranı: Opsiyonel department tag seçimi, custom tag ekleme ve primary tag belirleme
- [ ] Push Notifications: Bildirim izinlerinin alınması ve Expo Push Token entegrasyonu

## Faz 4: Mobil Uygulama - Mekan ve Tarayıcı Akışı (Mobile Business Agent)
- [ ] Mekan Personeli (Business Staff) için email/şifre giriş ekranı
- [ ] Mekan Ana Ekran: Katılınabilecek yaklaşan etkinlikler ve başlama saati öncesi katılma işlemleri
- [ ] Kamera Tarayıcı (Scanner) Ekranı: UI tasarımı ve barkod okuma entegrasyonu
- [ ] Tarama İsteği: `scan-qr` servisine istek atılması ve 4 saniyelik "Timeout / Zayıf İnternet" kontrolü
- [ ] Tarama Sonuç Ekranları: Başarılı (Yeşil), Zaten Okutuldu (Sarı), Hatalı/Süresi Dolmuş (Kırmızı)
- [ ] Tarayıcı Kilidi: Hızlı ardışık okutmayı engellemek için kameranın işlem bitene kadar dondurulması (Debounce)
- [ ] Geçmiş Ekranı: Mekan görevlisinin kendi okuttuğu leimaları görebileceği anlık liste

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
- *2026-04-27*: Faz 2 admin business approval flow tamamlandı; business review RPC'leri ve `admin-approve-business` / `admin-reject-business` Edge Function'ları eklendi.
- *2026-04-27*: Faz 2 leaderboard refresh cron job tamamlandı; `scheduled-leaderboard-refresh` eklendi ve async leaderboard smoke testleri geçti.
- *2026-04-27*: Faz 2 scheduled reminder cron foundation tamamlandı; `scheduled-event-reminders`, Expo batch/retry helper ve reminder query index'leri eklendi, local cron smoke testleri geçti.
- *2026-04-27*: Faz 2 push foundation tamamlandı; shared Expo push helper ile `register-device-token` ve `send-test-push` Edge Function'ları eklendi, local push smoke testleri geçti.
- *2026-04-27*: Öğrenci department tag desteği ürün planına eklendi; optional profile tags, official/custom sources ve duplicate merge yaklaşımı roadmap'e işlendi.
- *2026-04-27*: Faz 2 reward claim Edge Function tamamlandı; `claim-reward` eklendi ve local reward smoke testleri geçti.
- *2026-04-27*: Faz 2 QR Edge Function ilk dilimi tamamlandı; `generate-qr-token` ve `scan-qr` eklendi, local auth/DB/function smoke testleri geçti.
- *2026-04-27*: Ajan çalışma disiplini güçlendirildi; `REVIEW.md`, `PLAN.md`, `TODOS.md` zorunlu pre-implementation çalışma dosyaları olarak eklendi.
- *2026-04-27*: Ürün konumlandırması "Digital leima pass for Finnish student overalls events" olarak netleştirildi. Faz 1 Supabase database foundation tamamlandı; local migration/seed ve RPC smoke testleri geçti.
- *2026-04-26*: Ana mimari planlama, kural dosyaları (`AGENTS.md`) ve detaylı proje takip listesi (`PROGRESS.md`) mükemmeliyet odaklı oluşturuldu. Faz 0 tamamlandı.
