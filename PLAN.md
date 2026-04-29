# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Make the new stamp animation easier to preview during design review, and push leaderboard into a cleaner podium/list experience that matches the rest of the student app.

## Architectural Decisions

- Keep the current black / lime / white direction and avoid introducing another color family.
- Keep the in-app stamp motion in native `Animated`, and expose it through a dev-only local trigger instead of a fake backend path.
- Keep the scanner animation short and layered on top of the real result card.
- Move leaderboard closer to a stage/podium composition instead of a generic hero-card + list stack.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Add a permanent scanner test mode:
  - rejected because the user explicitly wants a temporary review button we can remove later
- Keep the large event-cover hero in leaderboard:
  - rejected because the current user feedback is that standings should feel more like a real leaderboard surface
- Add profile history immediately:
  - rejected because it likely duplicates events/rewards before we prove a separate information need

## Edge Cases

- The preview trigger must never call backend scan logic or mutate stamp state.
- Leaderboard still needs a sane fallback when there are fewer than three podium entries.
- The current-user highlight must stay legible if the lime treatment becomes stronger.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Add a temporary scanner preview button for the stamp animation.
- Tighten leaderboard toward a podium/list layout closer to the referenced direction.
- Leave profile history as a documented product recommendation for now.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note.
