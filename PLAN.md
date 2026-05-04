# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/mobile-club-announcement-management`
- **Goal:** Give club organizers a native mobile announcement management screen for posts/updates that students and businesses can already read.

## Architectural Decisions

- Use direct Supabase client access because existing announcement RLS is already scoped to platform admins and club event editors.
- Add a mobile read model for club memberships and latest club announcements.
- Treat delete as archive: update `status = 'ARCHIVED'` instead of deleting rows.
- Reuse storage upload patterns from club event covers, but target `announcement-media` and `clubs/{clubId}/announcements/...`.
- Keep push sending out of this first native slice unless there is an existing mobile-safe function route; publishing makes announcements visible in feed/popup immediately.
- Add a route-level screen under `/club/announcements` and expose it from club home.

## Edge Cases

- Organizer manages multiple clubs: form needs a club picker and must refresh after club changes.
- DRAFT, PUBLISHED and ARCHIVED states should be visible; archived rows can be edited back only if RLS allows update.
- Ends at can be empty; when present it must be after starts at.
- Image upload cancelled by user should not show an error.
- Invalid image type/permission/storage policy errors must show inline.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
