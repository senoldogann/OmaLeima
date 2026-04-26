# Proje İlerleme Takibi (Progress Tracker)

Bu dosya Digital Leima projesinin tüm ince detaylarını, fazların alt görevlerini ve merge edilen PR'ları takip etmek için kullanılır. AI Ajanları, görevlerini `LEIMA_APP_MASTER_PLAN.md` içerisindeki mimariye uygun olarak eksiksiz tamamladıktan sonra burayı güncellemekle yükümlüdür. Diğer ajanlar kod yazmaya başlamadan önce bu dosyayı okuyarak projenin mevcut durumunu analiz etmelidir.

## Faz 0: Planlama ve Kurallar
- [x] Ana mimari ve master planın oluşturulması (`LEIMA_APP_MASTER_PLAN.md`)
- [x] AI ajanları için kesin geliştirme kurallarının belirlenmesi (`AGENTS.md`)
- [x] İlerleme takip dosyasının detaylı alt fazlarla oluşturulması (`PROGRESS.md`)

## Faz 1: Veritabanı ve Temel Altyapı (Database Agent)
- [ ] Profil (`profiles`), Kulüp (`clubs`) ve Mekan (`businesses`) tablolarının oluşturulması
- [ ] Etkinlik (`events`), Mekan Katılımı (`event_venues`) ve Öğrenci Kayıt (`event_registrations`) tablolarının oluşturulması
- [ ] QR Kullanım (`qr_token_uses`) ve Damga/Leima (`stamps`) tablolarının oluşturulması
- [ ] Leaderboard (`leaderboard_scores`) ve Ödül (`reward_tiers`, `reward_claims`) tablolarının oluşturulması
- [ ] Bildirim (`notifications`) ve Fraud/Güvenlik (`fraud_signals`, `audit_logs`) tablolarının oluşturulması
- [ ] Tüm tablolara özel Foreign Key ve veri bütünlüğü için Unique Constraint'lerin eklenmesi
- [ ] İlgili Index'lerin (Performans iyileştirmeleri) oluşturulması
- [ ] Row Level Security (RLS) politikalarının (Güvenlik matrisine uygun şekilde) yazılması
- [ ] Atomik Damga İşlemi: `scan_stamp_atomic` RPC (Remote Procedure Call) fonksiyonunun kodlanması
- [ ] Puan Tablosu: Skor hesaplama (asenkron periyodik) ve listeleme (`get_event_leaderboard`) RPC'lerinin kodlanması
- [ ] Ödül talep (`claim_reward_atomic`) RPC fonksiyonunun kodlanması
- [ ] Test senaryoları için `seed.sql` başlangıç veri dosyasının hazırlanması

## Faz 2: Edge Functions, Güvenlik ve API Mantığı (Security/QR Agent)
- [ ] Proje genelinde kullanılacak TypeScript tiplerinin (Shared Types) oluşturulması
- [ ] `generate-qr-token` API'sinin yazılması (Maksimum katılımcı kontrolü ve JWT imzalaması dahil)
- [ ] `scan-qr` API'sinin yazılması (Zaman aşımı, tekrar kullanımı engelleme ve mekan doğrulama)
- [ ] `claim-reward` API'sinin yazılması
- [ ] `admin-approve-business` ve `admin-reject-business` API'lerinin yazılması
- [ ] `register-device-token` ve `send-push-notification` API'lerinin yazılması
- [ ] Periyodik (Cron) çalışan asenkron Edge Functions (Leaderboard toplu güncelleme, etkinlik hatırlatmaları)

## Faz 3: Mobil Uygulama MVP - Öğrenci Akışı (Mobile Student Agent)
- [ ] Expo projesinin başlatılması, klasör yapısı (app, src/features) ve kütüphanelerin kurulumu
- [ ] Supabase Auth ile Google Login entegrasyonunun sağlanması
- [ ] Global State (Örn: Zustand/Tanstack Query) ve Supabase Client bağlantısının kurulması
- [ ] Öğrenci Ana Ekran: Yaklaşan/Aktif etkinliklerin listelenmesi
- [ ] Etkinlik Detay Ekranı ve kapasite kurallı "Etkinliğe Katıl" işleminin arayüzü
- [ ] Öğrenci QR Ekranı: Dinamik, 30 saniyede bir yenilenen, ekran kaydı uyarılı QR kod gösterimi
- [ ] Leima (Damga) Ekranı: Anlık toplanan leimaların ve ödül kazanım ilerlemesinin gösterimi
- [ ] Leaderboard Ekranı: Top 10 ve kullanıcının kendi sıralamasının gösterimi
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
- [ ] **Kulüp Yetkilisi Modülü:** Yeni etkinlik oluşturma (Tarih, şehir, kapasite, kurallar)
- [ ] **Kulüp Yetkilisi Modülü:** Etkinlik ödül seviyelerinin (Reward Tiers) eklenmesi ve stok takibi
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
- *2026-04-26*: Ana mimari planlama, kural dosyaları (`AGENTS.md`) ve detaylı proje takip listesi (`PROGRESS.md`) mükemmeliyet odaklı oluşturuldu. Faz 0 tamamlandı.
