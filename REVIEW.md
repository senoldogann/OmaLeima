# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Make the next student motion/layout pass by shortening My QR so the code is visible without scrolling, auto-advancing rewards, and turning event discovery into an animated image/text slider.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/foundation/components/auto-advancing-rail.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`

## Risks

- My QR already carries both event context and the QR canvas, so adding more top chrome can easily push the actual code below the fold.
- Auto-advancing rails can feel broken if manual dragging and timer-driven scrolling fight each other.
- Discovery slider copy must stay legible over every image variant and still feel related to the current black/lime palette.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing discovery hero imagery helper
- Current profile tag modal flow
- Current event detail route structure

## Existing Logic Checked

- QR already knows the selected event and reward overview, so the visible-above-the-fold fix can stay in layout territory.
- Rewards already render a horizontal rail, so the missing piece is timed paging plus a clearer slide cue.
- Discovery hero already uses the shared event-cover helper, so the slider can reuse the same visual pool instead of inventing a new asset pipeline.

## Review Outcome

Do a focused motion/layout pass:

- compress the active-event top section so the QR itself appears without extra scrolling
- reuse a shared auto-advancing horizontal rail for rewards and discovery
- keep manual swipe intact while letting the rail advance every few seconds when idle
- re-run mobile validation and keep backend logic unchanged
