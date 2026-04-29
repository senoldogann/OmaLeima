# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/android-expo-go-push-guard`
- **Goal:** Make the Android emulator usable today by preventing Expo Go from crashing on `expo-notifications`, while still treating remote push as unavailable there.

## Architectural Decisions

- Keep the change focused inside the mobile push helper and diagnostics provider.
- Replace eager runtime imports of `expo-notifications` with lazy loading.
- When Android Expo Go cannot provide the notifications module, return a typed `unavailable` state instead of throwing.
- Do not weaken real-device push logic for iPhone development builds or real Android development builds.

## Alternatives Considered

- Leaving Expo Go Android unsupported and asking the user to ignore the crash:
  - rejected because it blocks useful emulator flow smoke
- Adding special-case guards throughout the UI only:
  - rejected because the root cause lives in the shared push module
- Removing `expo-notifications` usage entirely for emulator sessions:
  - rejected because we still want the same codepath to work on real builds

## Edge Cases

- Android Expo Go should not crash even if the diagnostics provider mounts immediately.
- Notification listener cleanup should still work when the module is available.
- `presentLocalNotificationAsync` should quietly no-op when the module is unavailable.

## Validation Plan

- Update the working docs.
- Run `npm --prefix apps/mobile run lint`.
- Run `npm --prefix apps/mobile run typecheck`.
- Restart Expo Go on the Android emulator and confirm the crash is gone.
