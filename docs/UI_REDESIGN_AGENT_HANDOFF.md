# UI Redesign Agent Handoff

Bu dosya, tasarim uygulamasini devralacak ajan icin tek giris noktasi olarak hazirlandi. Amac, yeniden kesif yapmadan dogrudan tasarim isine girebilmek.

## 1. Kisa baglam

- Branch: `feature/full-ui-redesign-foundation`
- Urun omurgasi dogrulandi:
  - iPhone ustunde gercek auth, QR, scanner, stamp, reward unlock ve remote push kanitlandi
  - hosted pilot akisi ve operator dry-run gate’leri yesil
  - Android tarafinda emulator fallback mevcut; broader public launch icin fiziksel Android proof maddeleri ayrica acik
- Kullanici tasarim kalitesinden memnun degil ve bu fazi baska bir ajanla surdurmek istiyor.

## 2. Tasarim hedefi

Teknik olarak stabil olan urunu, hem mobile hem web/admin tarafinda daha karakterli bir ortak dile tasimak.

Istenen ruh:

- ogrenciler
- partiler / gece hayati / enerji
- sadelik
- kolay kullanim
- generik “LLM UI” gibi durmayan bir urun kimligi

Kullanici ozellikle su fikri vurguladi:

- bir mekan QR okutulduktan sonra, kazanilan leimalarin o mekanin logosu veya kimligiyle daha hatiraya donusen, daha sinematik bir his vermesi

## 3. Dis tasarim referanslari

### Stitch linkleri

- [Liquid glass pass](https://stitch.withgoogle.com/projects/6107071878416305354)
- [Liquid admin panel](https://stitch.withgoogle.com/projects/18180386970930572592)
- [Android M3 expressive](https://stitch.withgoogle.com/projects/10357803785814815017)

### Local export klasorleri

- `/Users/dogan/Desktop/stitch_omaleima_liquid_glass_pass`
- `/Users/dogan/Desktop/stitch_omaleima_liquid_admin_panel`
- `/Users/dogan/Desktop/stitch_omaleima_android_m3_expressive`

### Ozellikle bakilmasi faydali dosyalar

- `/Users/dogan/Desktop/stitch_omaleima_liquid_glass_pass/liquid_glass_ios_26/DESIGN.md`
- `/Users/dogan/Desktop/stitch_omaleima_liquid_admin_panel/liquid_glass_admin/DESIGN.md`
- `/Users/dogan/Desktop/stitch_omaleima_android_m3_expressive/omaleima_core/DESIGN.md`

## 4. Tasarim yorumu

Stitch referanslarindan alinmasi beklenen yon:

- daha az “stacked cards”, daha cok “scene”
- daha derin, karanlik, geceye yakin arka plan mesh’i
- daha fiziksel, daha katmanli cam yuzeyler
- operational ekranlarda bile merkezde net odak
- admin tarafta daha sinematik ama hala bilgi yogunlugunu bozmayan bir shell
- iOS’ta daha guclu liquid-glass hissi
- Android’de Material 3 expressive’e yakin ama ayni urun ailesinde kalan fallback

## 5. Tasarim sirasinda korunacak guardrail’ler

- Auth, QR, scanner, stamp, reward unlock ve push akislari zaten kanitlandi; bunlari gereksiz yere yeniden acma.
- Bu faz esas olarak presentation / layout / motion / surface dili fazi.
- Query, mutation, schema, auth callback, QR refresh, scanner sonucu ve push mantigina dokunma; ancak gorsel bir ihtiyac cok netse, markup seviyesinde guvenli degisiklik yap.
- Scanner sonucu, bos state, active event secimi gibi operational yuzeylerde okunabilirlikten odun verme.
- Karanlik / cinematic arka plan kullanirken kontrasti ve action clarity’yi dusurme.

## 6. Once ele alinmasi gereken ortak foundation dosyalari

### Mobile shared foundation

- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/foundation/theme.ts`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/foundation/components/glass-panel.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/foundation/components/foundation-status-card.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/foundation/components/glass-tab-bar-background.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/components/app-screen.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/components/info-card.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/components/status-badge.tsx`

## 7. Mobile student redesign kapsami

### Route dosyalari

- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/_layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/active-event.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/events/_layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/events/index.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/events/[eventId].tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/leaderboard.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/profile.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/student/rewards.tsx`

### Feature / component dosyalari

- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/events/components/event-card.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/events/student-event-detail.ts`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/events/student-events.ts`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/profile/components/profile-tag-card.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/profile/student-profile.ts`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/qr/student-qr.ts`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/rewards/student-rewards.ts`

## 8. Mobile business redesign kapsami

### Route dosyalari

- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/business/_layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/business/home.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/business/events.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/business/scanner.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/business/history.tsx`

### Feature dosyalari

- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/scanner/scanner.ts`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/features/scanner/scan-transport.ts`

## 9. Mobile auth / landing yuzeyleri

Bu dosyalar da ortak dil disinda kalmamali:

- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/_layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/index.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/auth/_layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/auth/login.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/mobile/src/app/auth/callback.tsx`

## 10. Admin / club web redesign kapsami

### Shared shell

- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/globals.css`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/login/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/forbidden/page.tsx`

### Admin routes

- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/admin/layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/admin/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/admin/oversight/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/admin/business-applications/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/admin/department-tags/page.tsx`

### Club routes

- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/club/layout.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/club/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/club/events/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/club/rewards/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/club/claims/page.tsx`
- `/Users/dogan/Desktop/OmaLeima/apps/admin/src/app/club/department-tags/page.tsx`

## 11. Onerilen uygulama sirasi

1. Mobile shared foundation’i kesinlestir
2. Student tarafinda:
   - events list
   - event detail
   - active event / QR
   - rewards
   - profile
3. Business tarafinda:
   - home
   - events
   - scanner
   - history
4. Admin / club web shell
5. Venue/logo tabanli “earned leima memory” yuzeyleri

## 12. Ozellikle iyi sonuc verecek alanlar

- scanner bos state’ini “scene” gibi kurmak
- active event / QR tarafinda kazanilan leima hafizasini daha duygusal yapmak
- rewards ekraninda etkinlik/venue kimligini daha belirginlestirmek
- admin shell’de panel hissini “dark cinematic operational desk” tarafina tasimak

## 13. Bilincli olarak acik birakilan konular

Asagidakiler broader public launch proof maddeleridir; bu handoff’un odagi degil:

- Android physical-device remote push proof
- Android student Google login real dev-build / physical-device proof
- final domain cutover
- final public store rollout

## 14. Son not

Kullanici bu tasarim fazinin artik daha yuksek bir estetik seviyede gitmesini istiyor. “Biraz daha glass” yetmez; hedef, daha ayirt edici, daha sahneli, daha canli ama hala kullanimi cok rahat bir OmaLeima yuzeyi.
