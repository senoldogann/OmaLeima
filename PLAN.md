# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Keep the STARK theme but make it cleaner: fewer borders, fewer box-inside-box stacks, stronger lime-on-dark hierarchy, and clearer action buttons with icons.

## Architectural Decisions

- Keep the current STARK direction and avoid another redesign fork.
- Use lime as the primary action color against dark surfaces; keep cyan, pink, and amber as secondary signals only.
- Reduce visual framing through the shared foundation first: lighter borders, borderless cards where possible, stronger spacing.
- Add SVG icons only to clear controls and selectors, not decorative text rows.
- Keep logic untouched and stay in presentation/theme/component territory.

## Alternatives Considered

- Switch back to the earlier glass-heavy wave:
  - rejected because the user asked us to continue the current theme logic and the branch is already aligned around STARK
- Keep the palette as-is and only add icons:
  - rejected because the real issue is not missing icons alone; the current chrome still feels too boxed and noisy
- Remove nearly every card wrapper:
  - rejected because some structure is still needed for scannability on mobile

## Edge Cases

- Removing borders globally can make some stacked sections blend together if shadows and spacing are not strong enough.
- Active mode selectors need enough contrast after the border reduction, especially on Android and web.
- The sign-out button still needs an error state even if the surrounding explanatory copy is removed.
- Button icon additions must not break layout on narrow widths.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this simplification pass.
- Reduce border intensity in the shared theme and `GlassPanel`.
- Add reusable SVG icons for obvious action surfaces.
- Apply the cleaner button/icon treatment to:
  - `auth/login`
  - `google-sign-in-button`
  - `business-password-sign-in`
  - `sign-out-button`
  - selected business and rewards CTAs
- Remove leftover explanatory copy around sign-out.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the simplification handoff note.
