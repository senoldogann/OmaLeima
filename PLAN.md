# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Finish the next delight pass by adding stamp-hit motion to scanner success, removing redundant profile status, and making leaderboard feel premium instead of flat.

## Architectural Decisions

- Keep the current black / lime / white direction and avoid introducing another color family.
- Build the stamp-hit effect directly in React Native with `Animated`; do not offload this to Canva or Remotion because it needs to respond to real scan success.
- Keep the scanner animation short and layered on top of the real result card.
- Use the same event-cover system in leaderboard so it feels tied to the rest of student surfaces.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Use Canva or Remotion for the in-app stamp effect:
  - rejected because they are better for asset/video generation, not live UI feedback tied to scan success
- Leave leaderboard as a plain info-card stack:
  - rejected because it breaks the new design language and feels visibly weaker than events/rewards
- Keep the profile status line because it is technically correct:
  - rejected because it does not add useful value for the student

## Edge Cases

- Scanner error/warning states must not trigger the stamp-hit celebration.
- Leaderboard still needs a sane fallback when there are fewer than three podium entries.
- Profile should still feel complete when the user has no department tags at all.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Add stamp-hit success animation in scanner.
- Remove the profile status row.
- Restyle leaderboard hero, podium, and standings.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note.
