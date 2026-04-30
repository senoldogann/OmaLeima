# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Close the last obvious light-mode visual regressions by fixing image-hero contrast, reducing dirty outer shadows, and simplifying the profile preferences block.

## Architectural Decisions

- Keep the current light/dark theme system as-is and solve readability at the surface level with stronger image overlays plus image-specific text colors.
- Apply the same light-mode contrast fix to all student image surfaces together so the app keeps one coherent rule instead of screen-by-screen exceptions.
- Merge theme and language selectors into one shared settings card rather than adding a new route or modal.
- Soften shared shadow tokens globally enough to reduce the light-mode haze without starting another full redesign wave.

## Alternatives Considered

- Change the whole light palette again:
  - rejected for now because the primary problem is contrast on photography, not the base neutral palette
- Keep using theme text colors on image heroes and only darken the images:
  - rejected because image surfaces need their own stable foreground rule
- Add separate “appearance” and “language” cards with new icons:
  - rejected because the user explicitly wants less visual noise

## Edge Cases

- The same event image can appear in full-bleed hero and smaller event card contexts, so overlay opacity must still leave the photo readable without hiding all detail.
- Global shadow token softening must not make dark mode feel flat or break pressable depth entirely.
- The merged preferences card still needs enough copy for first-time users without turning back into a dense settings panel.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this light-mode polish slice.
- Fix hero overlays/text on `student/events`, `student/events/[eventId]`, `student/rewards`, `student/active-event`, and `EventCard`.
- Merge profile theme/language controls into one card and add missing icons.
- Soften shared shadow constants and rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
