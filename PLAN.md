# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Refine the live QR scene and rewards browsing so the active-event and rewards screens feel cleaner, less vertically stacked, and more deliberate without disturbing validated QR or reward logic.

## Architectural Decisions

- Keep the current STARK direction and avoid another theme fork.
- Treat the QR scene as a product surface, not a loading widget: use a static frame and restrained live cues instead of continuous rotation.
- Fix the clipped reward count in the shared reward card rather than patching only the active-event screen.
- Use a horizontal rewards rail so one event can be read at a time without forcing a long vertical scroll.
- Stay in presentation/layout territory and avoid touching validated business logic.

## Alternatives Considered

- Keep the rotating QR border and only slow it down:
  - rejected because the issue is not just speed; the treatment itself looks cheap
- Keep rewards vertical and only shorten each card:
  - rejected because the user explicitly called out too much stacked content
- Create a separate mini reward component only for active-event:
  - rejected for now because the clipped number is a shared card problem and should be fixed at the source

## Edge Cases

- A horizontal rail must still degrade gracefully when only one event exists.
- Long event names and many tier rows cannot overflow a narrower card width.
- The active QR scene should still show a clear loading/error state after the rotating affordance is removed.
- Typography changes cannot introduce new clipping on Android while fixing iPhone.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the QR/rewards polish slice.
- Replace the rotating QR ring with a static frame and cleaner live strip.
- Adjust the shared reward hero typography so `0 leimat` is rendered cleanly.
- Convert rewards event cards into a horizontal rail with constrained card width.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note and the next remaining design gaps.
