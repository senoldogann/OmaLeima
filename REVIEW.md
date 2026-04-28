# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-inventory-followup`
- **Scope:** Extend the mobile Realtime foundation so shared reward inventory and out-of-stock state stop lagging behind other students' claims, without mixing in the later notification slice.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/realtime/student-realtime.ts`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/features/events/student-event-detail.ts`
- `apps/mobile/src/features/leaderboard/student-leaderboard.ts`
- `apps/mobile/src/features/rewards/student-rewards.ts`
- `apps/mobile/README.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `docs/TESTING.md`

## Risks

- Realtime subscriptions can easily over-invalidate and create noisy refetch loops if the query keys are not scoped tightly.
- Supabase Postgres Changes filters are more limited than normal SQL filters, so we need to be careful about what is filtered at the channel level versus inside the callback.
- Reward inventory is shared per event, so a broad `reward_tiers` subscription can become noisy if we do not gate payload event ids before invalidating.
- This slice must stay focused on data freshness. The user explicitly said the full UI redesign will happen later.

## Dependencies

- Existing student query keys in `apps/mobile/src/features/rewards/student-rewards.ts`, `apps/mobile/src/features/events/student-event-detail.ts`, and `apps/mobile/src/features/qr/student-qr.ts`.
- The current student screens that show reward inventory and out-of-stock state.
- Supabase Realtime Postgres Changes behavior and filter constraints for JavaScript clients.

## Existing Logic Checked

- `student/rewards.tsx`, `student/active-event.tsx`, and `student/events/[eventId].tsx` all render reward inventory or out-of-stock state derived from `reward_tiers.inventory_claimed`.
- The previous Realtime slice already covers leaderboard freshness plus current-student progress freshness, but intentionally leaves shared reward inventory snapshot-based.
- `student-qr.ts` already keeps QR rotation alive through polling and should stay independent from the new Realtime work.
- The existing Realtime audit already proves leaderboard and current-student progress wiring, so this follow-up only needs to widen the inventory part honestly.

## Review Outcome

Build the smallest inventory follow-up that:

- subscribes to `reward_tiers` changes and invalidates only the relevant student reward and event-detail queries
- keeps the already-shipped leaderboard and current-student progress subscriptions intact
- leaves reward unlock notifications for a later dedicated slice
- leaves the broader UI redesign explicitly out of scope
