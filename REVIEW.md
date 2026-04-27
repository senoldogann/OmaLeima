# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-qr-screen`
- **Scope:** Phase 3 student QR screen with secure token refresh and capture-protection surface.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `supabase/functions/generate-qr-token/index.ts`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/features/events/*`
- `apps/mobile/src/features/qr/*`
- `apps/mobile/src/components/*`

## Risks

- QR refresh cadence is inconsistent in the master plan text, so the screen must follow the backend response contract instead of hard-coding its own interval.
- The QR screen must never expose token creation logic or signing behavior on the client.
- The app should not keep refreshing QR codes while backgrounded or while no registered active event is available.
- Screen-capture protection should not rely on extra Android media permissions unless we intentionally add screenshot-listener behavior.
- The screen should remain useful even when the student is registered only for an upcoming event or when QR refresh fails temporarily.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for dynamic QR behavior, active event tab, and anti-screenshot guidance.
- Existing `apps/mobile` auth foundation and route guard merged in Phase 3.
- Current `generate-qr-token` Edge Function contract and the event registration flow already enforced in Phase 3.

## Existing Logic Checked

- `apps/mobile` already has session bootstrap, route protection, and sign-out, so the events screen can assume authenticated access.
- Student event detail and secure join flow are already live, so the QR screen can assume a student reaches it after registration or from an already joined seed event.
- `generate-qr-token` now uses the shared registration rule path and returns `refreshAfterSeconds` plus `expiresAt`, which is enough to drive the client refresh loop.
- The current active-event tab is still a placeholder shell with no live query, no token refresh, and no capture protection.
- Expo ScreenCapture can block screenshots and recordings without adding screenshot-listener permissions when we only need prevention, not screenshot callbacks.

## Review Outcome

Implement the first real QR surface in `apps/mobile`: determine the student's active registered event, fetch dynamic QR payloads from `generate-qr-token`, refresh based on backend cadence while foregrounded, block screen capture on supported platforms, and show clear standby or error states when no active event is currently scannable.
