# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Continue the redesign polish by turning the event detail hero into a clean cover image and moving event identity/description into the content stack where it belongs.

## Architectural Decisions

- Treat the event detail hero as pure visual atmosphere, not as a text container.
- Keep the back button over the image for navigation speed, but move all semantic event information below the cover.
- Reuse the first detail card for title, badges, schedule, and description instead of adding another new section.

## Alternatives Considered

- Keep title and metadata on top of the event image and only tweak spacing:
  - rejected because the user explicitly wants the image itself to stay clean
- Add a second summary card between image and description:
  - rejected because the screen should get simpler, not longer

## Edge Cases

- The detail page still needs to remain scannable after removing hero text, so badges and schedule cannot become buried in long prose.
- The cover image must still visually connect to the content below even without overlaid typography.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this event-detail polish slice.
- Remove event-detail text from the cover image and restructure the first detail card.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
