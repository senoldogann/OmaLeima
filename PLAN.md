# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/club-event-sorting-polish`
- **Goal:** Keep organizer event lists readable by always placing live/upcoming/newer future events before completed history.

## Architectural Decisions

- Create a typed `sortClubEventsForOrganizer` helper near the club feature read model.
- Status priority: LIVE, UPCOMING, DRAFT, CANCELLED, COMPLETED.
- Within active/future statuses, sort by nearest start date first.
- Within completed/cancelled history, sort newest start date first while keeping them after active/future statuses.
- Use the helper before rendering Club Home live rail, next-events rail, and Club Upcoming results.

## Edge Cases

- `COMPLETED` filter must still show completed events even though they normally sit last.
- `ALL` view must not mix completed events ahead of upcoming events.
- Empty lists and preview modal behavior should remain unchanged.
- Sorting must copy arrays before `.sort`.

## Ordered Follow-Up Queue

1. Announcement follow/subscription preferences and read receipt analytics.
2. Pass return/reward handout operations for haalarimerkki pickup.
3. Scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
