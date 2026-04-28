# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-unlock-notification-followup`
- **Scope:** Add the smallest honest student reward notification behavior on top of the shipped Realtime foundation, without turning this slice into the later full notification center or UI pass.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/providers/app-providers.tsx`
- `apps/mobile/src/features/notifications/student-reward-notifications.ts`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/features/rewards/student-rewards.ts`
- `apps/mobile/src/features/realtime/student-realtime.ts`
- `apps/mobile/src/features/auth/session-access.ts`
- `apps/mobile/src/lib/push.ts`
- `apps/mobile/README.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `docs/TESTING.md`

## Risks

- Reward unlock alerts can become spammy if we notify on every refetch instead of on real state transitions.
- Local notification APIs behave differently across web, simulators, and physical devices, so the code has to degrade cleanly without pretending remote push is solved here.
- Reward state is derived from overview queries and Realtime invalidation, so the detector must not invent a second inconsistent source of truth.
- This slice must stay focused on behavior. The user explicitly said the full UI redesign will happen later.

## Dependencies

- Existing student reward overview read model in `apps/mobile/src/features/rewards/student-rewards.ts`.
- Current push preparation and notification handler setup in `apps/mobile/src/lib/push.ts`.
- Session area resolution in `apps/mobile/src/features/auth/session-access.ts`.
- Expo Notifications local presentation behavior and permission state.

## Existing Logic Checked

- The previous two Realtime slices already cover current-student reward progress and shared inventory freshness.
- Mobile currently prepares push permission and Expo token registration, but there is no student-side reward notification bridge yet.
- There is no notification center route or shared notification feature in the current mobile app, so this slice should not pretend to ship one.
- The master plan wants reward unlocked notifications, but the current repository does not yet distinguish between local foreground behavior and future remote push delivery.

## Review Outcome

Build the smallest reward notification follow-up that:

- detects real student reward state transitions from the existing overview read model
- presents a local device notification for newly unlocked rewards and a restrained stock-change notice when a previously available reward becomes unavailable
- avoids first-load backfill spam and avoids turning simple refetches into duplicate notifications
- keeps remote reward-unlocked push delivery and the broader notification center for later
- leaves the broader UI redesign explicitly out of scope
