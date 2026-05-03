# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/club-home-media-polish`
- **Goal:** Make the club mobile area match the intended organizer mental model: club identity at the top, live-event slider under actions, and editable club logo/cover/announcement controls.

## Architectural Decisions

- Add `clubs.cover_image_url` and `clubs.announcement` columns.
- Extend club dashboard read model and membership summary types to include `logoUrl`, `coverImageUrl`, and `announcement`.
- Add mobile club media picker/upload helpers using the existing `event-media` bucket.
- Add a club profile editor for selected club logo, cover, announcement, and contact email.
- Remove the separate `Klubit` home card and display the primary club name/city in the opening header.
- Keep the hero/slider under the manage button, but feed it only active/live events.
- Make organizer event image cards pressable and route to `/club/events?eventId=...`; make events screen honor that param.

## Edge Cases

- Home header shows the club name instead of a generic `Klubin päivä` only.
- Home no longer renders the separate `Klubit` card.
- The slider under the manage button only includes `timelineState === LIVE`.
- Club profile can upload logo/cover and save announcement/contact email.
- Pressing organizer event images opens the edit screen for that event.

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
