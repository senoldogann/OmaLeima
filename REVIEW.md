# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/mobile-announcement-feed`
- **Scope:** Add a persistent mobile announcement feed on top of the existing popup/push announcement foundation.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/announcements/announcements.ts`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/club/home.tsx`
- `supabase/migrations/20260504002053_announcement_feed_visibility.sql`

## Existing Logic Checked

- Existing `announcements` and `announcement_acknowledgements` tables exist with RLS.
- `AnnouncementPopupBridge` only reads `show_as_popup = true` active published announcements and hides acknowledged rows.
- `can_read_announcement` currently requires `show_as_popup = true` for ordinary users, so non-popup feed posts are not readable yet.
- Admin and club web can already create announcements and trigger push delivery.
- Mobile has no persistent feed surface for students, businesses, or club organizers.

## Risks

- RLS must still enforce audience visibility; mobile filtering alone is not enough.
- Popup acknowledgement should not remove a post from the persistent feed.
- Feed should stay compact so it does not clutter primary role screens.
- CTA links must remain explicit and not auto-open.

## Review Outcome

Relax `can_read_announcement` from popup-only to active audience visibility, keep popup query popup-only, add a feed query with read state, and embed a compact feed section in student profile, business home, and club home.
