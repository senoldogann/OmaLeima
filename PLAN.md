# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/announcement-storage-upload`
- **Goal:** Let admin and organizer announcement authors upload an image file directly to Supabase Storage instead of relying only on pasted URLs.

## Architectural Decisions

- Create a new public `announcement-media` storage bucket.
- Use object paths `platform/<timestamp>-<file>` for platform admins and `clubs/<clubId>/<timestamp>-<file>` for club announcements.
- Reuse existing `is_platform_admin()` and `is_club_event_editor_for()` helpers in storage policies.
- Add a client-side `uploadAnnouncementImageAsync` helper in admin that validates image type and size, uploads to Supabase Storage, verifies public readability, and returns a public URL.
- Keep the existing Image URL field so external URLs remain possible, but add a file picker as the primary path.

## Edge Cases

- DRAFT announcements can upload images before save because the object is public but only author-controlled by path policy.
- Club form with no selected club must reject upload before hitting storage.
- Unsupported file types and zero-byte files must fail explicitly.
- Platform admins and club organizers must not be able to write into each other's storage prefixes.

## Validation Plan

- Run:
  - `npx supabase@2.95.4 db push --yes`
  - `npx supabase@2.95.4 db lint --linked`
  - `npx supabase@2.95.4 migration list`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
