# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/mobile-club-event-creation-polish`
- **Goal:** Bring mobile organizer event creation closer to real Finnish appro operations and make public events easier to join from the student event list.

## Architectural Decisions

- Add an `event-media` Supabase Storage bucket with public reads and club-staff-only writes under `clubs/{clubId}/...`.
- Add a mobile event cover picker/upload helper using existing `expo-image-picker`.
- Replace the organizer cover URL input with upload/preview controls while preserving `coverImageUrl` in the event model.
- Replace raw datetime text fields in the organizer form with compact date/time pressable controls that still store local datetime strings.
- Render status chips during create and edit. For create, create the draft atomically first and then update status if the chosen status is not `DRAFT`.
- Add a dedicated `/club/upcoming` page with status/date filters and add it to the club stack.
- Turn organizer home event lists into horizontal rails so current/upcoming events do not become long vertical blocks.
- Add an optional direct join button beside `Avaa tapahtuma` for public/not-registered student events using the existing join mutation.

## Edge Cases

- Organizer chooses a phone image, upload succeeds, and the same cover URL is saved to the event.
- Organizer cancels image picking and the draft remains unchanged.
- Organizer edits start/end/join deadline through the new control and parser receives valid local datetime strings.
- Organizer creates a published public event and the created row is updated from draft to published.
- Student sees direct `Liity` only when the event is public and not already joined.
- Private/unlisted or already joined events still only open details.

## Ordered Follow-Up Queue

1. Platform/organizer announcements with push opt-in/read receipts.
2. Pass return/reward handout operations for haalarimerkki pickup.
3. Scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npx supabase@2.95.4 db push --yes`
  - `npx supabase@2.95.4 db lint --linked`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
