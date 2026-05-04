# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/mobile-club-announcement-management`
- **Scope:** Add mobile organizer announcement authoring so organizers can create, update, archive, and publish/push announcements without leaving the native app.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/club/_layout.tsx`
- `apps/mobile/src/app/club/home.tsx`
- `apps/mobile/src/app/club/announcements.tsx`
- `apps/mobile/src/features/announcements/club-announcements.ts`
- `apps/mobile/src/features/announcements/club-announcement-media.ts`

## Existing Logic Checked

- `announcements` table already supports club-owned announcements, audience, status, priority, popup flag, active window, CTA and `image_url`.
- RLS already allows `public.is_club_event_editor_for(club_id)` to manage own club announcements.
- `announcement-media` storage bucket already allows club authors to upload under `clubs/{clubId}/*`.
- Mobile feed/popup already renders visible announcements for students, businesses and club users.
- Web admin/club panel can create announcements, but native organizer mobile has no create/edit/archive UI yet.

## Risks

- Mobile direct Supabase mutations must stay inside existing RLS boundaries.
- Archiving should be the mobile "delete" action; hard delete would erase audit/history.
- Image upload must validate permission/type and surface storage policy errors clearly.
- Push sending is currently exposed via admin web API; mobile can publish/feed first and leave push send as follow-up unless a safe mobile edge function route already exists.

## Review Outcome

Add a native club announcements route with scoped read/create/update/archive mutations and storage-backed image picker. Link it from club home next to existing feed so organizers know where announcements are authored and students/businesses keep reading them through the existing feed/popup surfaces.
