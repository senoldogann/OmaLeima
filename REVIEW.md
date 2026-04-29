# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Add a temporary stamp-animation preview trigger, push leaderboard closer to a true podium/standings scene, and sanity-check whether profile needs a separate history surface.

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

- The preview trigger must stay clearly temporary and must not contaminate the real scanner flow or backend state.
- Leaderboard can easily become more decorative but less legible if podium/list hierarchy is overworked.
- Adding a profile history entry prematurely could duplicate rewards/events rather than clarify the product.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing discovery hero imagery helper
- Current profile tag modal flow
- Current event detail route structure

## Existing Logic Checked

- Scanner already uses `Animated` and a locked review state, so a dev-only preview can reuse the same result surface without touching RPC behavior.
- Leaderboard already has the right data split (`top10`, `currentUser`), so the pass should stay presentational.
- Profile already has events and rewards surfaces elsewhere, so a separate history route is optional rather than structurally required right now.

## Review Outcome

Do a focused follow-up pass:

- add a temporary dev-only stamp preview trigger
- tighten leaderboard toward a cleaner podium/list composition
- keep history as a product decision note instead of adding a redundant route right now
- re-run mobile validation and keep backend logic unchanged
