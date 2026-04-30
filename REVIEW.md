# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Fix the remaining light-mode readability issues on image heroes, soften the visible outer shadow language, and merge language/theme controls into a single cleaner settings surface.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/components/cover-image-surface.tsx`
- `apps/mobile/src/components/app-icon.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/foundation/theme.ts`

## Risks

- Light mode image heroes can technically render but still fail visually if overlay opacity and text color stay tied to generic theme text tokens.
- The shared shadow constants are global; if they are too strong in light mode the whole app keeps a “floating card” haze even after individual screen cleanups.
- Profile preferences were split across two cards, which kept the screen busier than needed and worked against the current simplification direction.

## Dependencies

- Existing light/dark + `fi/en` mobile infrastructure already added on this branch
- Existing image hero pattern built on `CoverImageSurface`
- Existing profile preference toggles and icon system

## Existing Logic Checked

- Student image hero surfaces already exist in `events`, `event detail`, `rewards`, and `my qr`; the issue is contrast and shadow polish, not missing structure.
- `EventCard` also uses image overlays, so the “coming up” readability issue should be fixed there instead of only in the top discovery hero.
- `profile.tsx` already has working theme and language mutations; this slice only needs to reorganize the presentation into one cleaner surface.

## Review Outcome

Do a focused UI polish pass:

- force strong, image-safe text contrast on all student hero/photo surfaces in light mode
- remove or soften the visible outer shadow language that looks dirty in light mode
- merge theme and language preferences into one compact settings card with icons
- rerun mobile validation and record the slice honestly
