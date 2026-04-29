# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Move celebration delight from the business scanner to the student leima gain moment, keep a dev-only student preview path, and simplify the business mobile surfaces into a cleaner operator-first flow.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/features/notifications/student-reward-celebration.tsx`
- `apps/mobile/src/features/notifications/student-reward-notification-model.ts`
- `apps/mobile/src/features/notifications/student-reward-notifications.ts`
- `apps/mobile/src/providers/app-providers.tsx`

## Risks

- If the new celebration listens to reward unlocks instead of raw stamp gains, it will still feel late and miss the user's core request.
- Business scanner cannot become so decorative that it slows down line workers during a real event.
- Dev-only preview entry points must stay clearly temporary and easy to remove before release.
- The celebration provider must not spam repeated overlays when realtime refreshes or multiple query invalidations arrive close together.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing reward overview + realtime invalidation flow
- Existing student QR active-event flow
- Current business scanner result flow

## Existing Logic Checked

- Student-side reward inventory and progress already refresh when stamps land, so the best place to hook delight is the reward overview bridge instead of the scanner result UI.
- Business scanner already exposes enough status and count data; the remaining issue is presentation, not missing backend fields.
- Business home, events, and history already work functionally; they mainly need more compact operator-facing copy and hierarchy.

## Review Outcome

Do a focused operator + student-delight pass:

- trigger the main celebration from student stamp gain, not business scan review
- keep a temporary student-side preview button for visual tuning
- strip the business scanner of the fake stamp theatrics and make result cards more operational
- tighten business home, events, and history so they read like staff tools
- re-run mobile validation after the refactor
