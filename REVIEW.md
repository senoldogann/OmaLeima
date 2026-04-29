# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Finish the follow-up student polish by removing duplicate discovery imagery, cleaning duplicate tag counts in profile, and simplifying the My QR top stack after the new motion pass.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/foundation/components/auto-advancing-rail.tsx`
- `apps/mobile/src/features/events/event-visuals.ts`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/rewards.tsx`

## Risks

- The deterministic fallback image hash can still produce repeated visuals across discovery slides unless selection is made explicit.
- My QR can get noisy again if we keep both the hero title and another identity label above the QR canvas.
- Profile can still feel redundant if the same tag-count information appears in both account summary and department-tag entry.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing discovery hero imagery helper
- Current profile tag modal flow
- Current event detail route structure

## Existing Logic Checked

- The shared event visual helper already owns the fallback image list, so discovery can select explicit unique images there instead of hashing keys.
- My QR hero already carries the event identity, so the second student-name row above the QR is optional chrome and safe to remove.
- Profile status can still be shown without repeating tag totals in the account hero.

## Review Outcome

Do a small cleanup pass:

- make discovery slides use explicitly different fallback imagery
- remove redundant student/tag count chrome from My QR and profile
- keep the new motion rail behavior intact
- re-run mobile validation and keep backend logic unchanged
