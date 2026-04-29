# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Finish the next student polish pass by making the event-detail back action visually usable again and giving My QR the same image-led opening as the other student screens.

## Architectural Decisions

- Keep the current black / lime / white direction and avoid adding a new accent family.
- Event detail should keep the full-bleed hero, but the back action must float above it with explicit stacking.
- My QR should reuse the existing event-cover system so the top scene feels related to discovery and detail.
- The QR hero should remain informational, not a second reward dashboard.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Move the back button below the hero instead of floating it above:
  - rejected because it hides the action after the user has already scrolled into the page
- Build a separate QR hero artwork unrelated to event covers:
  - rejected because it would fragment the student visual language and add extra art maintenance
- Add another stats panel under the new QR hero:
  - rejected because the user explicitly wants less clutter, not another card stack

## Edge Cases

- My QR still needs a usable top section when there is no remote cover image and only the fallback asset exists.
- The floating back action must remain readable over both bright and dark event covers.
- Upcoming-event and active-event variants should both feel consistent if the hero is shown for each state.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Float the event-detail back action above the hero with explicit stacking.
- Add a full-width event hero to My QR using the shared cover-source helper.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note.
