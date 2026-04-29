# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/android-expo-go-push-guard`
- **Scope:** Stop the Android emulator smoke path from crashing in Expo Go by guarding `expo-notifications` behind runtime-aware lazy loading, while keeping real Android remote push as a development-build or physical-device concern.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/lib/push.ts`
- `apps/mobile/src/features/push/native-push-diagnostics.tsx`

## Risks

- `expo-notifications` should stay fully active on iPhone development builds and on real native Android builds.
- Expo Go on Android should stop crashing, but it should not pretend push is available there.
- Diagnostics should degrade to `unavailable` cleanly instead of logging opaque runtime crashes.

## Dependencies

- Existing push helper in `apps/mobile/src/lib/push.ts`
- Existing diagnostics provider in `apps/mobile/src/features/push/native-push-diagnostics.tsx`
- Expo's current Android Expo Go limitation around `expo-notifications`

## Existing Logic Checked

- `apps/mobile/src/lib/push.ts` imports `expo-notifications` at module load time and sets a global notification handler immediately.
- `apps/mobile/src/features/push/native-push-diagnostics.tsx` also imports `expo-notifications` directly and uses listeners at mount time.
- On Android Expo Go, the app currently crashes before the real product flow renders because the notifications module is unavailable there on SDK 53+.

## Review Outcome

Ship a narrow runtime-safety follow-up that:

- lazy-loads `expo-notifications`
- returns `unavailable` instead of crashing on Android Expo Go
- keeps iPhone and real-device push behavior untouched
