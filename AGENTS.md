# AI Development Rules (AGENTS.md)

Bu proje kesin ve katı bir "faz bazlı" (phased) ve "özellik bazlı" (feature-by-feature) geliştirme disiplini izler. Projeye katkı sağlayan tüm AI Ajanları (LLM'ler) aşağıdaki kurallara **kesinlikle** uymak zorundadır.

---

## 0. SPDD — Yapılandırılmış Prompt Odaklı Geliştirme (Structured Prompt-Driven Development)

> **Temel İlke:** Kod yazmadan önce ne yapacağını netleştir, nasıl yapacağını tasarla, sınırları belirle — ve bunu prompt'un içine yaz. "Şunu düzelt" demek yetmez; kod var ama mantık yok, hız var ama kontrol yok sonucunu doğurur.

Bu proje Thoughtworks'ün SPDD yaklaşımını benimser. **Prompt'lar birincil geliştirme varlıklarıdır.** Kod gibi versiyonlanır, birikir ve her iterasyonda yeniden kullanılarak değer üretmeye devam eder.

### Geliştirme Döngüsü

Her görev şu üç aşamadan geçer:

```
İŞ AMACI  →  YAPILANDIRILMIŞ PROMPT  →  KOD & TESTLER
   ↑                                          |
   └──── birikmiş prompt + kod varlıkları ────┘
              (bir sonraki iterasyona taşınır)
```

1. **İş Amacı:** Neyi, neden yapıyorsun? İş ihtiyacını ve hedefi net olarak tanımla.
2. **Yapılandırılmış Prompt:** Kodu üretmeden önce aşağıdaki REASONS şablonuyla prompt'u yaz.
3. **Kod & Testler:** Ancak yukarıdaki iki adım tamamlandıktan sonra kod üretimine geç.

### REASONS Prompt Şablonu

Her özellik için prompt yazarken şu başlıkları doldur:

| Harf | Anlamı | Açıklama |
|------|--------|----------|
| **R** | Role (Rol) | Ajanın üstleneceği uzmanlık rolü (Örn: "Supabase Edge Function güvenlik uzmanısın") |
| **E** | End Goal (Hedef) | Tam olarak ne üretilecek? Somut çıktıyı tanımla. |
| **A** | Architecture (Mimari) | Hangi yapı, pattern veya katman kullanılacak? (Örn: Controller→Service→Repository) |
| **S** | Scope (Kapsam) | Neleri yapacak, neleri kesinlikle yapmayacak? Sınırları çiz. |
| **O** | Output Format (Çıktı Formatı) | TypeScript mi? SQL mi? Hangi dosyaya? Tip tanımları dahil mi? |
| **N** | Negative Constraints (Yasaklar) | Ne yapılmamalı? (Örn: `any` tipi yok, fallback yok, mock yok) |
| **S** | Standards (Standartlar) | Projenin kod stili, güvenlik kuralları, RLS gereksinimleri |

### Kötü Prompt vs. İyi Prompt

❌ **Kötü:** `"scan-qr edge function yaz"`

✅ **İyi (REASONS uygulanmış):**
```
Sen bir Supabase güvenlik uzmanısın.
Hedef: QR token'ı atomik olarak doğrulayan ve stamp ekleyen bir Edge Function.
Mimari: tek bir PostgreSQL RPC çağrısı (race condition önlemi), JWT ile kullanıcı doğrulama.
Kapsam: sadece scan-qr fonksiyonu — QR üretimi veya ödül akışına dokunma.
Çıktı: TypeScript, supabase/functions/scan-qr/index.ts dosyasına, tam tip tanımlarıyla.
Yasaklar: any tipi yok, sessiz hata yutma yok, fallback davranış yok.
Standartlar: AGENTS.md §5 güvenlik kuralları, mevcut _shared/cors.ts kullan.
```

### Prompt Varlıklarının Birikimi

- Her özellik için yazılan REASONS prompt'u **`PLAN.md`** içinde `## Prompt` başlığı altında saklanır.
- Bir sonraki iterasyonda benzer özellik geliştirilirken bu prompt şablonu başlangıç noktası olarak alınır ve rafine edilir.
- Prompt'lar kod commit'leriyle birlikte versiyonlanır; "neden böyle yazıldı" sorusunun cevabı prompt'ta bulunur.

---

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
- Her ajan, işi bitirmeden veya başka ajana devredilecek durumda bırakmadan önce `PROGRESS.md` içindeki **Son Ajan Devri (Latest Agent Handoff)** bölümünü güncellemelidir.
- Devir notu en az şunları içermelidir: tarih, branch, yapılan iş, neden yapıldığı, doğrulama durumu, sıradaki önerilen adım ve varsa açık riskler/blokajlar.
- Devir notları kısa, güncel durum odaklı ve eyleme geçirilebilir olmalıdır; geçmiş changelog'un tekrarı gibi yazılmamalıdır.

## 4. Zorunlu Çalışma Dosyaları (Required Working Docs)
Her ajan kod yazmadan önce ve iş boyunca aşağıdaki dosyaları güncel tutmalıdır. Bu dosyalar changelog değildir; mevcut işi anlamak, tasarlamak ve küçük adımlara bölmek için kullanılır.

1. **`REVIEW.md` - Önce sistemi analiz et**
   - Hangi dosyalar ve modüller etkileniyor?
   - Riskler neler?
   - Bağımlılıklar neler?
   - Mevcut benzer logic nerede var?

2. **`PLAN.md` - Koddan önce tasarım**
   - Nasıl yapılacağını yaz.
   - Mimari kararları belirt.
   - Değerlendirilen alternatifleri ve neden seçilmediklerini yaz.
   - Edge-case'leri açıkça listele.
   - **`## Prompt` başlığı altında bu özellik için REASONS şablonuyla yazılmış yapılandırılmış prompt'u ekle.** Bu prompt sonraki iterasyonlarda yeniden kullanılır.

3. **`TODOS.md` - Her zaman küçük uygulanabilir adımlar**
   - Planı küçük, sıralı ve doğrulanabilir görevlere böl.
   - Aynı anda çok fazla işi "in progress" bırakma.
   - İş bittikçe checkbox'ları güncelle.
   - Yeni ajan işe başlamadan önce `PROGRESS.md` ile birlikte bu dosyayı da okumalıdır.

Bu üç dosya her feature branch'te ilgili işe göre güncellenmelidir. İş tamamlanınca `PROGRESS.md` sonuç ve devir notunu tutar; `REVIEW.md`, `PLAN.md` ve `TODOS.md` ise son işin uygulanabilir bağlamını tutar.

## 5. Kod Kalitesi, Mimari ve Ölçeklenebilirlik (Code Quality & Scalability)
Bu proje 2 yıl sonra binlerce anlık kullanıcının yükü altında çökmeyecek, bakımı kolay ve profesyonel standartlarda yazılacaktır:

- **Güvenlik ve RLS (Zero Trust):** İstemciye (client) asla güvenmeyin. UI'da bir butonu gizlemek yetmez; veritabanında Row Level Security (RLS) politikalarını ve Edge Function içindeki yetki kontrollerini katı bir şekilde uygulayın.
- **Race Condition ve Concurrency (Eşzamanlılık):** Leima okutma, ödül alma ve etkinliğe kayıt olma gibi eşzamanlı isteklerin gelebileceği işlemlerde (Race Condition) veritabanında kesinlikle Atomic RPC'ler, Row-Level kilitler veya Unique Constraint'ler kullanın.
- **Sıkı Tip Güvenliği (Strict Typing):** TypeScript kullanırken `any` tipinden kesinlikle kaçının. Supabase'in otomatik ürettiği veritabanı tiplerini ve veri doğrulama şemalarını kullanarak uçtan uca tip güvenliği sağlayın. Runtime hatalarını compile-time'da yakalayın.
- **Edge Case (Sınır Durumları) Yönetimi:** "İnternet koparsa ne olur?", "Aynı QR saniyenin onda biri farkla iki kez okutulursa ne olur?", "Ödül tam alınırken iptal edilirse ne olur?" gibi senaryolara karşı savunmacı programlama (defensive programming) yapın.
- **Sessiz Hatalara (Silent Failures) Tolerans Yok:** Hataları yutmayın. API ve Edge Function'lar daima anlamlı hata kodları (Örn: `QR_EXPIRED`, `ALREADY_STAMPED`) dönmeli, frontend bu kodları kullanıcıya doğru UI state (yükleniyor, hata, başarılı) ile yansıtmalıdır.
- **Performans ve N+1 Sorguları:** İhtiyaç duyulan veriyi çekmek için döngü içinde veritabanına istek atmayın (N+1 problemi). Verileri Join/Select ile tek seferde alın. Gereksiz payload boyutlarından kaçının.
- **Sadelik ve Bakım Kolaylığı:** Kodun geleceğe dönük olması karmaşık olması demek değildir. Spagetti kod yazmayın. Fonksiyonlar kısa, modüler ve Tek Sorumluluk Prensibi'ne (Single Responsibility) uygun olmalıdır.
- **Odaklı Değişiklikler:** Yalnızca sizden istenen özellikle ilgili dosyaları güncelleyin. Sistemin geri kalanını, sizden istenmediği sürece "daha iyi yazabilirim" diyerek refactor etmeye kalkışmayın.

## 6. Proje Bağlamı ve Hakimiyet (Project Context Mastery)

> **Temel Kural:** Ajan, projenin ne olduğunu, kimin için yapıldığını ve nerede durduğunu bilmeden tek satır kod yazamaz. Bağlamı tahmin etmek yasaktır — her zaman dosyadan okunur.

### Oturum Başında Zorunlu Okuma Sırası

Her yeni oturumda (veya yeni bir göreve başlarken) ajan şu dosyaları **bu sırayla** okumalıdır:

```
1. AGENTS.md          → kurallar ve çalışma disiplini
2. <MASTER_PLAN>      → projenin vizyonu, hedef kitlesi, iş mantığı
3. PROGRESS.md        → projenin şu anki durumu, tamamlananlar, açık riskler
4. TODOS.md           → devam eden görevler ve sıradaki adımlar
5. PLAN.md            → aktif özelliğin tasarım kararları ve REASONS prompt'u
```

> `<MASTER_PLAN>` her projede farklı adda olabilir. Bu projede: `LEIMA_APP_MASTER_PLAN.md`.
> Eğer böyle bir dosya yoksa README.md veya projenin ana ürün dokümanı onun yerini alır.
> **Dosya adı ne olursa olsun bu adım atlanamaz.**

Bu beş dosya okunmadan herhangi bir dosya oluşturma, düzenleme veya terminal komutu çalıştırma yapılamaz.

### Proje Kimliği (Hızlı Başvuru)

> Bu bölüm her projede farklı doldurulur. Aşağıdaki format şablondur; mevcut projenin değerleriyle güncel tutulmalıdır.

- **Proje:** OmaLeima — Finlandiya'daki Türk öğrenci topluluğuna özel dijital damga kartı (leima) sistemi.
- **Kullanıcılar:** Öğrenciler (damga toplar, ödül alır) + İşletmeler/Kulüpler (QR üretir, etkinlik açar) + Admin (onay, yönetim).
- **Altyapı:** Supabase (DB + Auth + Edge Functions) + Expo React Native (mobil) + Next.js (admin panel).
- **Kritik Konseptler:** Atomik QR tarama, stamp kazanma, ödül kilidi açma, leaderboard.
- **Tek kaynak (source of truth):** `LEIMA_APP_MASTER_PLAN.md`

---

## 7. Uzun Oturum ve Compact Koruması (Long Session & Compact Guard)

> **Problem:** Uzun oturumlarda bağlam sıkıştırması (compact) yaşandığında ajan, daha önce okuduğu bilgileri "hatırladığını sanarak" halüsinasyon üretir. Gerçekte hafıza silinmiş, ama güven duygusu kalmıştır.

### Compact Sonrası Zorunlu Yeniden Yükleme

Oturumda bir compact (bağlam sıkıştırması) gerçekleştiğini fark eden veya şüphelenen ajan şunları yapmalıdır:

1. **Dur.** Devam etme.
2. **§6'daki beş dosyayı tekrar oku** — bellekten değil, diskten.
3. Çalıştığın dosyanın son halini oku — compact öncesi yaptığın değişiklikleri varsayma.
4. `TODOS.md` içindeki son tamamlanmış adımı bul — nereden devam edeceğini oradan belirle.
5. Ancak bunları yaptıktan sonra devam et.

### Halüsinasyon Risk Sinyalleri

Ajan aşağıdaki durumlardan birini fark ederse **kesinlikle durmalı ve dosyaları yeniden okumalıdır:**

- "Bunu daha önce yazmıştım" veya "bu dosya şöyle görünüyordu" gibi bir varsayımla hareket ediyorsa
- Bir değişkenin, fonksiyonun veya API endpoint'inin var olduğunu hatırlıyor ama dosyada göremiyorsa
- Görevin nerede durduğunu hatırlamıyor ama tahmin edebileceğini düşünüyorsa
- İki mesaj önce yapılan bir kararı hatırlamıyorsa

### Uzun Oturumda Aktif Önlemler

- Her **5 anlamlı adımdan** sonra `TODOS.md`'yi oku ve tamamlananları kontrol et.
- Bir dosyayı düzenlemeden önce her zaman o dosyanın güncel halini oku — compact öncesi okunan versiyonu geçersizdir.
- "Bence şöyle olmalı" yerine her zaman "dosya şunu söylüyor" ile karar ver.
- Emin olmadığın her şeyi kullanıcıya sor — tahmin etmek yasaktır.
