# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Finish the next student polish pass by making My QR visible earlier in the viewport, giving rewards an idle auto-slider, and turning event discovery into an animated visual slider.

## Architectural Decisions

- Keep the current black / lime / white direction and avoid introducing another color family.
- Build one shared auto-advancing rail component instead of duplicating timer/scroll logic in multiple screens.
- My QR should become shorter by collapsing duplicate event chrome, not by shrinking the QR itself too aggressively.
- Discovery slider should cycle through a small curated set of local visual/copy states related to the product mood.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Hide the QR behind a modal and keep the current long page:
  - rejected because the user wants the code visible immediately, not behind another tap
- Auto-advance by replacing the current rewards rail with a pager library:
  - rejected because the existing horizontal scroll can be extended without a new dependency
- Keep discovery as a single static hero and only add dots:
  - rejected because the user explicitly asked for multiple changing visuals and text

## Edge Cases

- Auto-advance must pause naturally when the user drags the rail.
- Rewards and discovery should not crash or show broken offsets when there is only one item.
- My QR should still look balanced when there is no selected reward overview and only the QR token state is available.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Add a shared auto-advancing rail helper.
- Use it for rewards and event discovery.
- Compress the active-event top stack so the QR sits higher in the viewport.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note.
