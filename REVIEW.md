# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Keep polishing the student redesign by making the event detail hero image clean (no text on the photo) and moving event identity/description into the content flow below it.

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

- Event detail was still mixing two jobs in one hero: decorative photography and primary content. That made the cover busy and fought against the cleaner direction the user wants.
- Moving title/meta/description below the image must not make the detail page feel disconnected or lose fast-scanning context.

## Dependencies

- Existing light/dark + `fi/en` mobile infrastructure already added on this branch
- Existing image hero pattern built on `CoverImageSurface`
- Existing profile preference toggles and icon system

## Existing Logic Checked

- The remaining obvious design mismatch is `student/events/[eventId]`: the image is used as a hero but still carries too much copy directly on top of the photo.
- The surrounding cards already have enough structure to carry title, badges, schedule, and description cleanly below the image.

## Review Outcome

Do a focused UI polish pass:

- make the event detail cover image clean and decorative
- move event identity and description into the content stack below the hero
- rerun mobile validation and record the slice honestly
