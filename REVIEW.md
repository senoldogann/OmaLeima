# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/native-push-device-smoke-readiness`
- **Scope:** Add the smallest honest native-device push smoke readiness slice on the mobile app: dev-client alignment, in-app push diagnostics, and a repo-owned audit path that makes the next physical iOS/Android verification step observable.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `package.json`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/lib/push.ts`
- `apps/mobile/src/providers/app-providers.tsx`
- `apps/mobile/src/types/app.ts`
- `apps/mobile/src/features/push/native-push-diagnostics.tsx`
- `apps/mobile/scripts/audit-native-push-device-readiness.mjs`
- `tests/run-mobile-native-push-readiness.mjs`
- `apps/mobile/README.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `docs/TESTING.md`

## Risks

- The app already prepares Expo push tokens, but real remote receipt still depends on a development build on a physical device. The new slice must not pretend Expo Go is good enough.
- `expo-dev-client` alignment can affect app startup. The import and dependency change must stay minimal and still pass web export.
- Notification listeners must not create duplicate subscriptions or stale snapshots across route changes. The diagnostics surface belongs at provider level, not inside one screen effect.
- The diagnostics surface should help manual smoke work without becoming a notification center redesign. The user explicitly parked the big UI pass for later.

## Dependencies

- Existing Expo push preparation helper in `apps/mobile/src/lib/push.ts`.
- Current student profile route, which already owns the notification registration action and is the most honest place to expose diagnostics.
- Expo development build guidance, especially the `expo-dev-client` step and the requirement for a physical device for push verification.
- Existing reward notification bridge and remote reward-unlocked backend path from the previous slice.

## Existing Logic Checked

- `apps/mobile/src/lib/push.ts` already has permission requests, project id lookup, and Expo token preparation, but it does not expose runtime diagnostics or last notification capture.
- `apps/mobile/src/app/student/profile.tsx` already has a notification-readiness card and backend token registration result, but it cannot yet show whether a remote push was actually received or opened.
- `apps/mobile/package.json` has `expo-notifications`, `expo-device`, and `expo-constants`, but it does not currently include `expo-dev-client`.
- The repository does not yet have a focused audit for native push device smoke readiness or a root QA wrapper for that state.

## Review Outcome

Build the smallest native push smoke readiness slice that:

- aligns the mobile app with Expo development-build guidance through `expo-dev-client`
- captures last received notification and last notification response at provider level
- exposes that diagnostics state on the student profile route that already owns push registration
- adds a read-only audit and root QA wrapper so future device-smoke work starts from a measurable baseline
- keeps full native build execution, store packaging, and the broader UI redesign out of scope
