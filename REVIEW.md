# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/announcements-foundation`
- **Scope:** Add the first platform/club announcement foundation with RLS, admin/club authoring, and mobile popup delivery.

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
- `apps/admin/src/features/announcements/*`
- `apps/admin/src/features/dashboard/sections.ts`
- `supabase/migrations/*_announcements_foundation.sql`

## Existing Logic Checked

- Existing push/notification tables are user-delivery records, not a source-of-truth authoring model for announcements.
- Admin web already uses server read models plus route handlers for privileged mutations.
- Mobile already has app-level providers for global UX bridges such as reward celebrations and push diagnostics.
- Club organizers can be authorized with `is_club_event_editor_for`; platform admins use `is_platform_admin`.

## Risks

- Announcement reads must not leak draft/archived rows to normal users.
- Club authors must not publish platform-wide announcements.
- Mobile popup must be dismissible and should not reappear after local user dismissal.
- Push delivery/opt-in is intentionally a later slice; this foundation should not fake push success.

## Review Outcome

Create announcement source tables and acknowledgement tracking, add admin/club authoring pages, and mount a mobile announcement popup bridge that reads active published announcements.
