# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Close the next visible light-mode and settings polish gaps without starting a new redesign branch: auth hero glare, discovery hero title contrast, rewards hero alignment, and fragmented profile settings.

## Architectural Decisions

- Keep image-based surfaces on a consistent rule: dark overlay plus white foreground, even in light mode.
- Use one explicit content wrapper inside the rewards hero so the stamp number and copy align deterministically.
- Collapse profile preferences, notifications, and sign-out into one main settings card instead of several adjacent cards.
- Push the light card language through `GlassPanel` so app-wide boxes converge toward the same white + subtle-border treatment.

## Alternatives Considered

- Leave the login hero shimmer in place and only adjust copy colors:
  - rejected because the overlay itself is what makes the image feel washed out in light mode
- Fix rewards hero alignment with ad hoc margins:
  - rejected because the real issue is the missing shared layout wrapper
- Keep notifications and sign-out outside the settings card:
  - rejected because the user explicitly asked for one consolidated settings surface when possible

## Edge Cases

- Changing `GlassPanel` affects many screens at once, so the light-mode border/background shift must stay subtle.
- The consolidated settings card must remain readable even with button states and push registration feedback inside it.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this light-mode/settings polish slice.
- Remove the light-mode glare from the login hero.
- Force the events discovery hero title into image-safe white foreground.
- Add a proper layout container to the rewards summary hero.
- Merge notifications and sign-out into the main profile settings card.
- Normalize light-mode card surfaces through `GlassPanel`.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
