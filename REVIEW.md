# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/announcement-push-followers`
- **Scope:** Add announcement push fan-out and notification delivery records on top of the in-app announcement foundation.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/providers/app-providers.tsx`
- `apps/mobile/src/features/announcements/*`
- `apps/admin/src/app/admin/announcements/page.tsx`
- `apps/admin/src/app/club/announcements/page.tsx`
- `apps/admin/src/app/api/announcements/create/route.ts`
- `apps/admin/src/app/api/announcements/send-push/route.ts`
- `apps/admin/src/features/announcements/*`
- `apps/admin/src/features/dashboard/sections.ts`
- `supabase/functions/send-announcement-push/index.ts`

## Existing Logic Checked

- Existing push helpers already batch Expo messages, retry transient failures, and record notification delivery for promotions.
- `announcement_acknowledgements` already gives in-app read/dismiss receipts for popup announcements.
- Admin web already uses server read models plus route handlers for privileged mutations.
- Club organizers can be authorized with `is_club_event_editor_for`; platform admins use `is_platform_admin`.

## Risks

- Push must be server-side only; clients should only invoke an authenticated route/edge function.
- Repeat sends for the same announcement should be blocked after successful delivery records exist.
- Club organizers must only send club-scoped announcements they can edit.
- Recipient selection must be explicit by audience and avoid sending to inactive profiles.

## Review Outcome

Add `send-announcement-push` Edge Function, route-handler transport, and a web panel action that sends push for published active announcements while recording per-user notification rows.
