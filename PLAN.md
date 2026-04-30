# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Make leaderboard feel like part of the event product, not a detached ranking utility, while keeping the student surfaces concise.

## Architectural Decisions

- Reuse the same cover-image language already used in events and rewards.
- Extend leaderboard event data instead of hardcoding fallback card copy in the screen.
- Show one strong event context surface in the hero and compact context in the selector cards, rather than repeating full details everywhere.

## Alternatives Considered

- Keep leaderboard as text-only chips:
  - rejected because users cannot visually parse events fast enough
- Show long descriptions in leaderboard cards:
  - rejected because it would overload a screen whose job is ranking and event selection

## Edge Cases

- Events with no remote image must still get a deterministic cover.
- Completed events must show a useful ended date instead of a vague status-only label.
- Added event context must not make leaderboard noisier than the main events list.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this leaderboard/context slice.
- Extend leaderboard event data with image/location fields.
- Rebuild the leaderboard hero and event selector with real event context.
- Replace vague completed copy with dated event context.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
