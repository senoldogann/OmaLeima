# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/announcements-foundation`
- **Goal:** Build the first reliable announcement foundation so platform admins and club organizers can publish in-app popup announcements.

## Architectural Decisions

- Add `announcements` as the authoring table and `announcement_acknowledgements` as the per-user dismissal table.
- Use RLS for active read visibility, platform-wide authoring by platform admins, and club-scoped authoring by club owners/organizers.
- Add web read model and one create route used by both `/admin/announcements` and `/club/announcements`.
- Add a mobile app-level popup bridge that fetches active published announcements and records dismissal.
- Keep remote push fan-out, organizer follow preferences, and read receipts as the next dedicated feature slice.

## Edge Cases

- Dismissed announcements should not re-open for the same user.
- Club organizers can only create announcements for clubs where they can create events.
- Platform announcements have `club_id = null`; club announcements require `club_id`.
- Mobile should skip the popup when the session is anonymous or still loading.
- Time windows must respect `starts_at <= now` and optional `ends_at`.

## Ordered Follow-Up Queue

1. Platform/organizer announcements with push opt-in/read receipts.
2. Pass return/reward handout operations for haalarimerkki pickup.
3. Scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run build`
  - `npx supabase@2.95.4 db lint --linked`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
