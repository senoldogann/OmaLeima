# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/club-event-sorting-polish`
- **Scope:** Make organizer event ordering consistent so active/upcoming events appear first and completed events stay last.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/upcoming.tsx`
- `apps/mobile/src/features/club/event-ordering.ts`

## Existing Logic Checked

- Club Home currently consumes dashboard events in backend order.
- Club Upcoming already has a `COMPLETED` status filter, but the all-view sort is raw ascending start time.
- The user expects active/new/future events before ended events in both Tulossa and sliders.

## Risks

- Sorting must not mutate React Query cached arrays in place.
- Completed and cancelled events should not bury live/upcoming events.
- The status filter order should surface `Päättynyt` clearly in Tulossa.

## Review Outcome

Add a shared club event ordering helper and use it in Club Home live/next rails and Club Upcoming filtered lists.
