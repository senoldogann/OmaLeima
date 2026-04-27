# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-push-registration`
- **Scope:** Phase 3 mobile device notification registration from the student profile surface.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/push/*`
- `apps/mobile/src/lib/push.ts`
- `apps/mobile/src/components/*`

## Risks

- The native push registration path is unavailable on web and Expo Go, so the UI must explain that limitation instead of looking broken.
- Permission-granted and backend-registered are two separate steps; the screen must not imply backend enrollment if token registration fails.
- `register-device-token` accepts only `IOS | ANDROID`, so the client must never post a web or unknown platform shape.
- We do not yet have a stable per-device identifier dependency in the app, so this slice should avoid inventing a fake `deviceId`.
- Real end-to-end validation still requires a development build on a physical device even if local backend smoke tests pass.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for student push notification readiness in Phase 3.
- Existing `apps/mobile` auth foundation and route guard merged in Phase 3.
- Existing `register-device-token` Edge Function, Expo push foundation, and current `preparePushTokenAsync` helper.

## Existing Logic Checked

- `apps/mobile` already has session bootstrap, route protection, and sign-out, so the events screen can assume authenticated access.
- The current profile tab already has a button that exercises `preparePushTokenAsync`, but it stops before backend registration.
- `register-device-token` already exists server-side and enforces authenticated ownership plus platform validation.
- `app.config.ts` already includes the `expo-notifications` plugin, and `lib/push.ts` already prepares permission + token on supported native devices.
- The missing product surface is a student-facing action that turns native token preparation into a real backend enrollment result with clear success and failure states.

## Review Outcome

Implement a student-facing notification enrollment surface in `apps/mobile`: reuse the existing native Expo token preparation helper, post the token to `register-device-token` with the authenticated session, and show clear device, permission, and backend-registration states on the profile tab.
