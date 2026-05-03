# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/club-event-preview-flow`
- **Goal:** Make event images inside the club mobile area open an event preview first, then let organizers explicitly continue to edit.

## Architectural Decisions

- Add a shared `ClubEventPreviewModal` under the club feature folder.
- Reuse `ClubDashboardEventSummary` so preview opens instantly from already-loaded dashboard data.
- Change Club Home live/event rails and Club Upcoming cards to open the preview modal on image/card press.
- Keep `/club/events?eventId=...` routing only behind an explicit `Muokkaa/Edit` preview action.

## Edge Cases

- Pressing organizer event images opens an in-context preview, not the edit form.
- The preview still exposes status, time, description, participant, venue, and minimum leima context.
- Explicit edit action closes the modal and routes to the selected event edit form.
- Empty or missing descriptions should not create dead space.

## Ordered Follow-Up Queue

1. Platform/organizer announcements with push opt-in/read receipts.
2. Pass return/reward handout operations for haalarimerkki pickup.
3. Scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
