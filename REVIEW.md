# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/mobile-announcement-feed-routes`
- **Scope:** Productize the existing announcement system as a fuller mobile feed surface for student and business roles.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/student/updates.tsx`
- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/updates.tsx`

## Existing Logic Checked

- Announcement backend, RLS, acknowledgements, impressions, notification preferences, popup bridge, and push sender already exist.
- `AnnouncementFeedSection` already reads published announcements, records impressions, toggles push preferences, marks read, and renders image cards.
- Student profile and business home already embed a compact feed, but there was no full feed destination for normal browsing.
- Club organizers already have `/club/announcements` for authoring announcements.

## Risks

- Student tab navigation should not gain a sixth visible tab just because the route exists.
- Full feed route should reuse the same secure read model instead of creating a new query path.
- Compact embedded feed should remain lightweight and simply link to the full feed.

## Review Outcome

Add dedicated student and business updates routes that reuse `AnnouncementFeedSection` in full mode, and add compact feed CTA links from profile/home. Hide the student updates route from the bottom tab bar.
