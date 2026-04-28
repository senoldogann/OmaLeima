# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-implementation-foundation`
- **Scope:** Ship the first real mobile Realtime foundation for student leaderboard and current-student stamp/claim progress without reopening the postponed broad UI pass.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/realtime/student-realtime.ts`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/features/leaderboard/student-leaderboard.ts`
- `apps/mobile/src/features/rewards/student-rewards.ts`
- `apps/mobile/README.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `docs/TESTING.md`

## Risks

- Realtime subscriptions can easily over-invalidate and create noisy refetch loops if the query keys are not scoped tightly.
- Supabase Postgres Changes filters are more limited than normal SQL filters, so we need to be careful about what is filtered at the channel level versus inside the callback.
- Reward inventory still changes when other students claim the same tier, so this first slice must not pretend shared inventory is fully Realtime yet.
- This slice must stay focused on data freshness. The user explicitly said the full UI redesign will happen later.

## Dependencies

- Existing student query keys in `apps/mobile/src/features/leaderboard/student-leaderboard.ts`, `apps/mobile/src/features/rewards/student-rewards.ts`, and `apps/mobile/src/features/qr/student-qr.ts`.
- The current student screens that show leaderboard or stamp-derived reward state.
- Supabase Realtime Postgres Changes behavior and filter constraints for JavaScript clients.

## Existing Logic Checked

- `student/leaderboard.tsx` currently loads a selected event snapshot once and then stays stale unless the user manually refetches or revisits the screen.
- `student/rewards.tsx` and `student/active-event.tsx` both depend on reward progress derived from valid `stamps`, but neither screen has any subscription path today.
- `student-qr.ts` already keeps QR rotation alive through polling and should stay independent from the new Realtime work.
- The audit from the last slice now proves the current state is deferred, so this slice can safely introduce `apps/mobile/src/features/realtime`.

## Review Outcome

Build the smallest real Realtime foundation that:

- subscribes to `leaderboard_updates` for the selected student event and invalidates only the relevant leaderboard query
- subscribes to student stamp and own-claim changes for the current event and invalidates the progress queries that depend on them
- keeps QR polling as-is
- leaves the broader UI redesign explicitly out of scope
