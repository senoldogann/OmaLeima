# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Finish the current student polish slice by fixing the event discovery hero fill, removing duplicate profile role wording, and making event detail back navigation safe.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/components/app-icon.tsx`

## Risks

- The discovery hero currently sits inside an outer card, so image padding reads like broken empty space.
- Profile role copy can easily repeat itself once tags and role labels both surface in the hero.
- A blind `router.back()` call can throw a development warning when the detail screen is opened directly.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing discovery hero imagery helper
- Current profile tag modal flow
- Current event detail route structure

## Existing Logic Checked

- Discovery already has the right image source, so the remaining issue is layout chrome around it.
- Profile now has the right avatar direction, but role copy still duplicates the student identity.
- Event detail uses direct push navigation, so `back()` needs a safe fallback route.

## Review Outcome

Do a small stabilization pass:

- make discovery hero fill its own full area without outer black padding
- replace the duplicate profile role wording with the active tag when available
- make event detail back navigation fall back to `/student/events`
- re-run mobile validation and keep logic unchanged
