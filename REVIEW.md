# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/announcement-storage-upload`
- **Scope:** Replace announcement image URL-only workflow with storage-backed upload for platform admins and club organizers.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `supabase/migrations/*_announcement_media_storage.sql`
- `apps/admin/src/features/announcements/components/announcements-panel.tsx`
- `apps/admin/src/features/announcements/media-upload.ts`
- `apps/admin/src/features/announcements/client.ts`

## Existing Logic Checked

- Announcement schema already has nullable `image_url` and mobile feed/popup can render it.
- Admin/club announcement form currently only accepts a raw Image URL, which is fragile and inconsistent with requested media workflows.
- Existing `event-media` bucket is scoped to clubs/event media; using a dedicated public `announcement-media` bucket keeps policies and object paths clear.
- Platform admin uploads need a platform-owned path; club organizer uploads need a club-owned path checked by existing club editor helper.

## Risks

- Browser upload must keep RLS strict: platform admins can upload platform images, club organizers only their club images.
- Announcement form must still support manual URL paste for external images if needed.
- Upload errors must be visible and should not silently submit an empty image.

## Review Outcome

Add a dedicated announcement media bucket with public read and scoped upload/update/delete policies, then add a reusable admin client upload helper and file picker UI that stores the uploaded public URL into the existing `imageUrl` payload.
