# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/announcement-push-followers`
- **Goal:** Let admins and club organizers send already-published announcements as real Expo push notifications with delivery records.

## Architectural Decisions

- Add `send-announcement-push` Edge Function using the existing Expo push helper and service-role Supabase client.
- Use audience-aware recipient selection from active profiles, business staff, club staff, and club event registrations.
- Insert `notifications` rows with `type = ANNOUNCEMENT` and delivery result payloads.
- Add `/api/announcements/send-push` route so the web panel can trigger the function with the current authenticated session.
- Add a send-push button to the announcement list.
- Keep user-facing follow/subscription preference UI as a separate next slice.

## Edge Cases

- Draft/archived/inactive announcements must not send.
- Announcement pushes must not send twice once successful delivery records exist.
- If no enabled device tokens exist, return a clear no-recipient status.
- Partial push failures should still record per-user notification outcomes.
- Club-scoped audience `STUDENTS` targets registered students from that club's events.

## Ordered Follow-Up Queue

1. Announcement follow/subscription preferences and read receipt analytics.
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
  - `npx supabase@2.95.4 functions deploy send-announcement-push`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
