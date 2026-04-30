# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Close the next visible student polish gaps without starting a new branch: readable reward cards in light mode, a cleaner event-detail info block, and calmer settings controls.

## Architectural Decisions

- Keep text on top of photography image-safe: dark overlay plus white foreground regardless of active theme.
- Keep reward-card claimability readable by using a dedicated overlay pill instead of reusing the generic surface badge over imagery.
- Replace loose event-detail meta pills with a dedicated three-cell information block.
- Treat theme and language as dropdown-style settings rows that open a lightweight modal, instead of showing multiple chips inline.
- Remove helper prose under familiar settings actions unless the state itself adds new information.

## Alternatives Considered

- Keep using the generic `StatusBadge` on reward imagery:
  - rejected because its surface colors are tuned for cards, not for photo overlays in light mode
- Leave event-detail metadata as wraparound pills:
  - rejected because it still reads like temporary chrome instead of structured event info
- Keep theme/language as inline chips:
  - rejected because the settings card already feels dense and the user explicitly asked for a neater dropdown treatment

## Edge Cases

- The dropdown modal must not interfere with the existing department-tag modal.
- Notification status still needs to surface errors or registration results, even after removing generic helper copy.
- Event-detail place/date/time should stay readable in both compact phones and wider layouts.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this student polish slice.
- Make reward-card overlay text and claimable state readable in light mode.
- Tighten reward-card number/unit spacing.
- Replace event-detail meta pills with a dedicated place/date/time block.
- Convert theme and language controls into dropdown-style selectors.
- Remove redundant helper copy from settings actions.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
