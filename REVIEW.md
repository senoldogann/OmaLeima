# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/announcement-media-cards`
- **Scope:** Add optional announcement images so the mobile feed can feel like richer post cards.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/announcements/announcements.ts`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/features/announcements/announcement-popup-bridge.tsx`
- `apps/admin/src/features/announcements/types.ts`
- `apps/admin/src/features/announcements/validation.ts`
- `apps/admin/src/features/announcements/transport.ts`
- `apps/admin/src/features/announcements/read-model.ts`
- `apps/admin/src/features/announcements/components/announcements-panel.tsx`
- `apps/admin/src/app/api/announcements/create/route.ts`
- `supabase/migrations/20260504005808_announcement_media_cards.sql`

## Existing Logic Checked

- Persistent mobile feed and popup bridge exist, but both only render text/CTA.
- Admin and organizer web announcement form can create title/body/audience/CTA/status, but has no image field.
- Announcement read model, transport, and validation use explicit typed payloads.
- Mobile already has `CoverImageSurface` and event fallback assets that can safely render remote or fallback imagery.

## Risks

- Optional image URL must not be required for existing announcements.
- Mobile must fall back to curated local imagery if the remote image fails.
- Admin URL validation should reject invalid values before writing them.
- Push notification payload can include the image URL as data, but should not depend on it.

## Review Outcome

Add nullable `image_url` to `announcements`, thread it through admin creation/read models and mobile feed/popup models, and show image-backed announcement cards with safe fallback imagery.
