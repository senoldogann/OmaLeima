# AI Development Rules (AGENTS.md)

Bu proje kesin ve katı bir "faz bazlı" (phased) ve "özellik bazlı" (feature-by-feature) geliştirme disiplini izler. Projeye katkı sağlayan tüm AI Ajanları (LLM'ler) aşağıdaki kurallara **kesinlikle** uymak zorundadır.

## 1. Git İş Akışı ve İzolasyon (Strict Git Workflow)
- **Asla Doğrudan Main'e Yazma:** Yeni bir özellik, veritabanı tablosu veya arayüz ekranı geliştirilirken kesinlikle doğrudan `main` (veya `master`) dalına kod yazılmaz. 
- **Her Özellik İçin Yeni Branch:** Geliştirilecek her modül için kendi branch'i açılmalıdır (Örn: `feature/db-schema`, `feature/qr-edge-function`, `feature/student-login`).
- **Test ve Doğrulama:** Özellik tamamlandığında mutlaka test edilmelidir (Backend için cURL/Postman, Mobil için yerel Expo testleri vb.). Çalışmayan veya eksik kod commitlenmez.
- **PR, Merge ve Temizlik (Branch Deletion):** Test edilen özellik `main` dalına birleştirilir. **Merge işlemi başarıyla tamamlandıktan sonra özellik branch'i KESİNLİKLE SİLİNMELİDİR (Clean up).** Yeni bir özelliğe başlarken her zaman temiz, güncel bir `main` dalından yepyeni bir branch açılır.

## 2. Faz Bazlı İlerleme (Phased Development)
Aynı anda veritabanı, mobil uygulama ve admin panelini yapmaya çalışmak yasaktır. İlerleme sırası Master Plan ve PROGRESS.md dosyasına göre şu şekildedir:
1. **Faz 1:** Veritabanı ve Temel Altyapı (Tablolar, RLS, DB Fonksiyonları).
2. **Faz 2:** Edge Functions, Güvenlik ve API Mantığı.
3. **Faz 3:** Mobil Uygulama MVP (Öğrenci akışı ve Dinamik QR).
4. **Faz 4:** Mobil Uygulama Mekan Akışı (Kamera tarayıcı ve çevrimdışı önlemler).
5. **Faz 5:** Next.js Admin ve Kulüp Paneli (Yönetim, etkinlik oluşturma, ödül onayı).
6. **Faz 6:** Kalite Güvencesi (QA) ve Canlıya Hazırlık.
Bir faz (ve altındaki görevler) tamamen bitip test edilmeden ve onaylanmadan diğer faza geçilemez.

## 3. İlerleme Takibi (Progress Tracking)
- Projedeki tüm tamamlanmış işler **`PROGRESS.md`** dosyasına kaydedilmelidir.
- Ajanlar her yeni göreve başlamadan önce, projenin hangi aşamada olduğunu anlamak için `PROGRESS.md` dosyasını okumalıdır.
- Bir branch main'e merge edildiğinde (özellik tamamlandığında), Ajan mutlaka `PROGRESS.md` dosyasını güncelleyerek neyin tamamlandığını (tarihiyle birlikte) listeye eklemelidir.

## 4. Kod Kalitesi, Mimari ve Ölçeklenebilirlik (Code Quality & Scalability)
Bu proje 2 yıl sonra binlerce anlık kullanıcının yükü altında çökmeyecek, bakımı kolay ve profesyonel standartlarda yazılacaktır:

- **Güvenlik ve RLS (Zero Trust):** İstemciye (client) asla güvenmeyin. UI'da bir butonu gizlemek yetmez; veritabanında Row Level Security (RLS) politikalarını ve Edge Function içindeki yetki kontrollerini katı bir şekilde uygulayın.
- **Race Condition ve Concurrency (Eşzamanlılık):** Leima okutma, ödül alma ve etkinliğe kayıt olma gibi eşzamanlı isteklerin gelebileceği işlemlerde (Race Condition) veritabanında kesinlikle Atomic RPC'ler, Row-Level kilitler veya Unique Constraint'ler kullanın.
- **Sıkı Tip Güvenliği (Strict Typing):** TypeScript kullanırken `any` tipinden kesinlikle kaçının. Supabase'in otomatik ürettiği veritabanı tiplerini ve veri doğrulama şemalarını kullanarak uçtan uca tip güvenliği sağlayın. Runtime hatalarını compile-time'da yakalayın.
- **Edge Case (Sınır Durumları) Yönetimi:** "İnternet koparsa ne olur?", "Aynı QR saniyenin onda biri farkla iki kez okutulursa ne olur?", "Ödül tam alınırken iptal edilirse ne olur?" gibi senaryolara karşı savunmacı programlama (defensive programming) yapın.
- **Sessiz Hatalara (Silent Failures) Tolerans Yok:** Hataları yutmayın. API ve Edge Function'lar daima anlamlı hata kodları (Örn: `QR_EXPIRED`, `ALREADY_STAMPED`) dönmeli, frontend bu kodları kullanıcıya doğru UI state (yükleniyor, hata, başarılı) ile yansıtmalıdır.
- **Performans ve N+1 Sorguları:** İhtiyaç duyulan veriyi çekmek için döngü içinde veritabanına istek atmayın (N+1 problemi). Verileri Join/Select ile tek seferde alın. Gereksiz payload boyutlarından kaçının.
- **Sadelik ve Bakım Kolaylığı:** Kodun geleceğe dönük olması karmaşık olması demek değildir. Spagetti kod yazmayın. Fonksiyonlar kısa, modüler ve Tek Sorumluluk Prensibi'ne (Single Responsibility) uygun olmalıdır.
- **Odaklı Değişiklikler:** Yalnızca sizden istenen özellikle ilgili dosyaları güncelleyin. Sistemin geri kalanını, sizden istenmediği sürece "daha iyi yazabilirim" diyerek refactor etmeye kalkışmayın.
