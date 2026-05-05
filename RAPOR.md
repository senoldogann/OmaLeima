# OmaLeima Kanit Tabanli Teknik Analiz Raporu

**Tarih:** 2026-05-02  
**Kapsam:** Supabase migrations, Edge Functions, mobile app, admin panel  
**Amac:** Her bulgu icin dosya yolu + satir + kod kaniti verilmistir.

---

## KRITIK (C)

### C-1: Ogrenci Etkinlik Kaydi Iptali Tamamen Eksik

**Siddet:** Kritik

**Kanit 1** - Policy DROP edildi, yerine hicbir sey eklenmedi:
```
Dosya: supabase/migrations/20260428220000_register_event_atomic.sql
Satir 1-2:
  drop policy if exists "students can register themselves" on public.event_registrations;
  drop policy if exists "students can cancel own registrations" on public.event_registrations;
```

**Kanit 2** - Tum projede `cancel_registration` arama sonucu bos:
```
grep -r "cancel_registration" supabase/ apps/
-> No matches found
```

**Sonuc:** Kayit olan ogrenci ne backend ne frontend uzerinden kaydini iptal edemiyor.

---

### C-2: `/club` Route'u Root Stack Layout'a Kayitli Degil

**Siddet:** Kritik

**Kanit:**
```
Dosya: apps/mobile/src/app/_layout.tsx
Satir 67-74:

  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="auth" />
    <Stack.Screen name="student" />
    <Stack.Screen name="business" />
    {/* 'club' burada kayitli degil */}
  </Stack>
```

**Sonuc:** Expo Router'da explicit kayitsiz ekranlar parent Stack'in screenOptions degerlerini almaz.
club ekranlari native header ile acilir.

---

### C-3: `qr_token_uses` Tablosunda Hic RLS SELECT Politikasi Yok

**Siddet:** Kritik

**Kanit 1** - RLS etkin:
```
Dosya: supabase/migrations/20260427180000_initial_schema.sql
Satir 359:
  alter table public.qr_token_uses enable row level security;
```

**Kanit 2** - Hic SELECT policy yok:
```
grep -r "policy.*qr_token_uses" supabase/migrations/
-> No matches found
```

**Sonuc:** Supabase client uzerinden hicbir rol (PLATFORM_ADMIN dahil) bu tabloyu okuyamiyor.
Fraud review ve audit tamamen kapali.

---

### C-4: Isletme Basvurulari Anonim Abuse'a Acik

**Siddet:** Kritik

**Kanit:**
```
Dosya: supabase/migrations/20260427180000_initial_schema.sql
Satir 445:
  create policy "anyone can create business applications"
    on public.business_applications for insert
    with check (status = 'PENDING');
```

Rate limiting yok, `to authenticated` kisitlamasi yok, e-posta dogrulama yok.
Herhangi bir anonim kullanici sinirstiz basvuru acabilir.

---

## YUKSEK (H)

### H-1: Leaderboard, Canli Etkinlikte Gercek Zamanli Guncellenmiyor

**Siddet:** Yuksek

**Kanit 1** - `scan_stamp_atomic` leaderboard cagrisi yapmiyor:
```
Dosya: supabase/migrations/20260429113000_scan_stamp_atomic_reward_unlocks.sql
(satir 1-203 tamamen incelendi)
-> update_event_leaderboard cagrisi YOKTUR
```

**Kanit 2** - Guncelleme sadece scheduler'dan geliyor:
```
Dosya: supabase/functions/scheduled-leaderboard-refresh/index.ts
Satir 157-170:
  for (const eventId of dirtyEventIds) {
    const { error: refreshError } = await supabase.rpc("update_event_leaderboard", {
      p_event_id: eventId,
    });
  }
```

**Sonuc:** Aktif etkinlikte her stamp icin siralama guncellenmez. Scheduler'a bagimli.

---

### H-2: Scanner Konum Verisi Her Zaman `null` Sabit Kodlanmis

**Siddet:** Yuksek

**Kanit:**
```
Dosya: apps/mobile/src/features/scanner/scan-transport.ts
Satir 94-101:
  body: JSON.stringify({
    qrToken,
    businessId,
    scannerDeviceId,
    scannerLocation: {
      latitude: null,   // hardcoded
      longitude: null,  // hardcoded
    },
  }),
```

Tum lokasyon tabanli fraud detection kalici olarak devre disi.

---

### H-3: QR Token Cache Key'inde Parametre Semantic Hatasi

**Siddet:** Yuksek

**Kanit:**
```
Dosya: apps/mobile/src/features/qr/student-qr.ts

Satir 78-79 - fonksiyon tanimi:
  export const studentGenerateQrTokenQueryKey = (eventId: string, studentId: string) =>
    ["student-generate-qr-token", eventId, studentId] as const;

Satir 269 - cagri yeri:
  queryKey: studentGenerateQrTokenQueryKey(eventId, accessToken),
  //                                                ^^^^^^^^^^^^
  //              2. parametre 'studentId' bekleniyor, 'accessToken' veriliyor
```

Access token her ~1 saatte rotasyona girer. Token yenilenince cache gecirsizlesiyor.

---

## ORTA (M)

### M-1: `register_event_atomic` - Profiles Satirini Gereksiz Yere Kilitliyor

**Kanit:**
```
Dosya: supabase/migrations/20260428220000_register_event_atomic.sql
Satir 33-37:
  select * into v_profile from public.profiles
  where id = p_student_id
  for update;  -- sadece okuma yapiliyor, hic UPDATE yok
```

FOR UPDATE yerine FOR SHARE veya sade SELECT yeterli.

---

### M-2: Push Notification Gonderim Sayaci Yanlis

**Kanit:**
```
Dosya: supabase/functions/scan-qr/index.ts
Satir 256:
  const notificationsSent = pushResults.some((result) => result.ok) ? 1 : 0;
  // Dogru: pushResults.filter(r => r.ok).length
```

3 cihazli kullaniciya 2 basarili + 1 basarisiz push gonderilirse: notificationsSent=1 kayit eder.

---

### M-3: Leaderboard Refresh Scheduler - Olaylari Sirali Isliyor

**Kanit:**
```
Dosya: supabase/functions/scheduled-leaderboard-refresh/index.ts
Satir 157-172:
  for (const eventId of dirtyEventIds) {
    const { error } = await supabase.rpc('update_event_leaderboard', ...);
    // await ile sirali - paralel degil
  }
```

Promise.allSettled() ile paralele alinabilir.

---

### M-4: WEEKLY/MONTHLY/YEARLY Leaderboard Scope'lari Olu Sema

**Kanit 1** - Schema constraint:
```
Dosya: supabase/migrations/20260427180000_initial_schema.sql
Satir 191-192:
  check (scope_type in ('EVENT', 'WEEKLY', 'MONTHLY', 'YEARLY'))
```

**Kanit 2** - Yalnizca EVENT yaziliyor:
```
Dosya: supabase/migrations/20260427181100_leaderboard_functions.sql
Satir 18:
  'EVENT',
```

Hicbir migration WEEKLY/MONTHLY/YEARLY veri yazmiyor.

---

### M-5: `is_platform_admin()` Her RLS Degerlendirilmesinde Ayri DB Sorgusu

**Kanit:**
```
Dosya: supabase/migrations/20260427180000_initial_schema.sql
Satir 371-385:
  create or replace function public.is_platform_admin()
  returns boolean language sql stable security definer as
  $$ select exists (select 1 from public.profiles where id = auth.uid() ...) $$;
```

stable isaretleme ayni statement icinde optimize eder ama cross-statement memoization saglamaz.
Admin dashboard'da cok sayida tablo sorgulandiginda her tablo icin ayri profil SELECT yapilir.

---

## DUSUK / GOZLEMLER (L)

### L-1: QR Token Guvenlik Penceresi Ag Gecikmeyle Sikisabilir

**Kanit:**
```
Dosya: supabase/functions/_shared/qrJwt.ts
Satir 4-6:
  export const qrTokenTtlSeconds = 45;
  export const qrRefreshAfterSeconds = 30;
  // clockTolerance: 5 saniye
```

Efektif guvenlik penceresi ~10 saniye (45-30-5). Yavaz baglantida QR_EXPIRED riski.

---

### L-2: Admin Session Hata Tespiti String Eslestirmeye Dayali

**Kanit:**
```
Dosya: apps/admin/src/features/auth/route-user.ts
Satir 3-6:
  const isMissingSessionError = (message: string): boolean =>
    message.toLowerCase().includes("auth session missing") ||
    message.toLowerCase().includes("session_not_found");
```

Supabase SDK hata mesaji metni degisirse sessizce kirilir. Hata kodu ile karsilastirilmalidir.

---

### L-3: `notifications.user_id` Nullable Ama Policy Null Case'i Kapsamiyor

**Kanit:**
```
Dosya: supabase/migrations/20260427180000_initial_schema.sql
Satir 484:
  create policy "users can read own notifications" on public.notifications
    for select using (user_id = auth.uid());
```

user_id IS NULL olan broadcast bildirimleri hicbir kullaniciya gorunmez; orphan row olusur.

---

### L-4: `events.rules` JSONB - Hicbir Sema Dogrulamasi Yok

**Kanit:**
```
Dosya: supabase/migrations/20260427180000_initial_schema.sql
Satir 116:
  rules jsonb not null default '{}'::jsonb,
```

Check constraint, migration dogrulamasi yok. Farkli organizer'lar tutarsiz yapilar yazarsa veri drift olusur.

---

### L-5: Migration Sira Bagimliligii - scan_stamp_atomic Kisitsiz Penceresi

**Kanit:**
```
Migration v1: supabase/migrations/20260427181000_scan_stamp_atomic.sql
  -> EXECUTE kisitlamasi yok; public/authenticated calistirabiliyor.

Migration v2: supabase/migrations/20260429114500_restrict_scan_stamp_atomic_execute.sql
  revoke execute on function public.scan_stamp_atomic(...) from public, anon, authenticated;
  grant execute on function public.scan_stamp_atomic(...) to service_role;
```

Iki migration arasinda kismi deployment yapilirsa RPC world-callable olur.

---

### L-6: `fetchSessionAccessAsync` - Zorunlu 2-Adim Waterfall

**Kanit:**
```
Dosya: apps/mobile/src/features/auth/session-access.ts
Satir 132-148:
  // Adim 1 (paralel, OK):
  const [profile, businessMemberships, clubMemberships] = await Promise.all([...]);

  // Adim 2 (sirali - Adim 1 bitmeden baslamiyor):
  const activeBusinesses = await fetchActiveBusinessesAsync(...);
  const activeClubs = await fetchActiveClubsAsync(...);
```

Iki ayri network round-trip zorunlu. Tek JOIN veya Promise.all ile tek sefere indirilebilir.

---

## Ozet Matrisi

| ID  | Baslik                              | Siddet   | Birincil Kanit Dosyasi                              |
|-----|-------------------------------------|----------|-----------------------------------------------------|
| C-1 | Ogrenci kayit iptali yok            | Kritik   | migrations/20260428220000_register_event_atomic.sql |
| C-2 | /club root layout'ta eksik          | Kritik   | apps/mobile/src/app/_layout.tsx                     |
| C-3 | qr_token_uses RLS SELECT yok        | Kritik   | migrations/20260427180000_initial_schema.sql:359    |
| C-4 | Anonim basvuru spami                | Kritik   | migrations/20260427180000_initial_schema.sql:445    |
| H-1 | Leaderboard real-time degil         | Yuksek   | migrations/20260429113000_scan_stamp_atomic_...sql  |
| H-2 | Scanner konum hep null              | Yuksek   | apps/mobile/src/features/scanner/scan-transport.ts  |
| H-3 | QR cache key semantic hatasi        | Yuksek   | apps/mobile/src/features/qr/student-qr.ts:78+269   |
| M-1 | Gereksiz profile row lock           | Orta     | migrations/20260428220000_register_event_atomic.sql |
| M-2 | Yanlis notification sayaci          | Orta     | supabase/functions/scan-qr/index.ts:256             |
| M-3 | Sequential leaderboard refresh      | Orta     | supabase/functions/scheduled-leaderboard-refresh/   |
| M-4 | Olu leaderboard scope'lari          | Orta     | migrations/20260427181100_leaderboard_functions.sql |
| M-5 | is_platform_admin() N sorgu         | Orta     | migrations/20260427180000_initial_schema.sql:371    |
| L-1 | QR guvenlik penceresi dar           | Dusuk    | supabase/functions/_shared/qrJwt.ts                 |
| L-2 | String-based session hata tespiti   | Dusuk    | apps/admin/src/features/auth/route-user.ts          |
| L-3 | Orphan broadcast notifications      | Dusuk    | migrations/20260427180000_initial_schema.sql:484    |
| L-4 | events.rules semasiz JSONB          | Dusuk    | migrations/20260427180000_initial_schema.sql:116    |
| L-5 | Migration sira bagimliligii         | Dusuk    | migrations/20260429114500_restrict_scan_stamp...sql |
| L-6 | 2-adim session waterfall            | Dusuk    | apps/mobile/src/features/auth/session-access.ts     |
