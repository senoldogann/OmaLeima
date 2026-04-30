# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Fix the next visible student-surface issues: light-mode reward card readability, tighter leima metric spacing, a cleaner event-detail meta area, and dropdown-style theme/language controls without redundant settings copy.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/components/app-icon.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`

## Risks

- The reward event cards still used theme-dependent text and badges over photography, which made light mode look muddy.
- Event detail still showed its date/place/time as loose pills instead of a proper information block.
- Profile settings had the right controls, but chip toggles plus helper paragraphs still made the card feel busier than needed.

## Dependencies

- Existing light/dark + `fi/en` mobile infrastructure on this branch
- Existing event cover pattern built on `CoverImageSurface`
- Existing profile modal pattern already used for department tags

## Existing Logic Checked

- Rewards already had the right data and structure; the issue was presentation on top of imagery.
- Event detail already kept the hero clean, so the next fix belonged in the first content card.
- Profile already had one settings card and one modal pattern, so dropdown-like selection could be added without introducing a new navigation path.

## Review Outcome

Do a focused UI polish pass:

- make reward-card hero text and claimable state image-safe in light mode
- tighten the leima metric spacing inside reward cards
- replace the event-detail meta pills with a dedicated place/date/time block
- turn theme and language selection into dropdown-style controls
- strip redundant helper copy from settings actions
- rerun mobile validation and record the slice honestly
