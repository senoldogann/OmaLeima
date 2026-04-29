# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Add the first in-app stamp-hit animation, remove the redundant active/profile status label, and restyle leaderboard so it feels like the same product as the other student screens.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/foundation/components/auto-advancing-rail.tsx`
- `apps/mobile/src/features/events/event-visuals.ts`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/leaderboard/components/leaderboard-entry-card.tsx`

## Risks

- Scanner success animation cannot delay or obscure the real scan result long enough to confuse staff during a live queue.
- Leaderboard restyle should improve hierarchy without making ranking less scannable.
- Removing the profile status label must not leave the account hero visually empty.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing discovery hero imagery helper
- Current profile tag modal flow
- Current event detail route structure

## Existing Logic Checked

- Scanner already uses `Animated` for the result card reveal, so the first stamp-hit layer can reuse the same animation stack.
- Leaderboard already has a podium/list split, so the biggest gain is better scene composition instead of changing data flow.
- Profile account area already has email and tag identity, so the status chip is optional and safe to remove.

## Review Outcome

Do a focused delight pass:

- add a short stamp-hit overlay to scanner success
- remove the redundant profile status row
- restyle leaderboard with stronger podium, event hero, and standings composition
- re-run mobile validation and keep backend logic unchanged
