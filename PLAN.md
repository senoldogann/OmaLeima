# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/announcement-media-cards`
- **Goal:** Make announcements support optional images across admin/organizer creation and mobile feed rendering.

## Architectural Decisions

- Add nullable `image_url` to `announcements` with length validation.
- Keep URL input explicit in the current admin/organizer web form; storage upload for announcement media can remain a later slice.
- Thread `imageUrl` through admin create/read types and the route handler.
- Thread `imageUrl` through mobile active/feed announcement read models.
- Render feed cards with `CoverImageSurface` and deterministic fallback image; render popup hero image only when an announcement has a real image.
- Include `imageUrl` in announcement push data payload for future notification rich preview work.

## Edge Cases

- Existing announcements with null `image_url` still render as text cards.
- Broken remote image URLs show fallback artwork instead of a black surface.
- Club organizers can only create image-backed announcements for clubs they already manage because existing announcement RLS still applies.
- CTA and image URL are independent; one can exist without the other.

## Validation Plan

- Run:
  - `supabase db push`
  - `supabase migration list --linked`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run build`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
