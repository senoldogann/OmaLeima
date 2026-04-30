# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Polish the remaining visible light-mode issues: remove the bright login shimmer, make the discovery hero title image-safe, keep rewards hero metrics aligned, and collapse profile settings into one cleaner card.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/features/auth/components/login-hero.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/components/cover-image-surface.tsx`
- `apps/mobile/src/components/app-icon.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/foundation/theme.ts`
- `apps/mobile/src/features/foundation/components/glass-panel.tsx`

## Risks

- The login hero still had a light-mode white glaze that washed the photography out.
- The rewards hero count block was visually drifting because the image card lacked one explicit layout container.
- Profile settings were cleaner than before, but notifications and sign-out still sat outside the main settings card.

## Dependencies

- Existing light/dark + `fi/en` mobile infrastructure already added on this branch
- Existing image hero pattern built on `CoverImageSurface`
- Existing profile preference toggles and icon system

## Existing Logic Checked

- The remaining visible mismatch after the last pass lived in the auth hero, events discovery hero, rewards hero alignment, and the fragmented profile settings surface.
- `GlassPanel` already controls the card look for most screens, so making its light-mode surfaces whiter is the lowest-friction way to normalize box backgrounds app-wide.

## Review Outcome

Do a focused UI polish pass:

- remove the bright light-mode shimmer on the login hero
- force image-safe title contrast on the discovery hero
- align the rewards hero count/text properly
- move notifications and sign-out into the same profile settings card
- rerun mobile validation and record the slice honestly
