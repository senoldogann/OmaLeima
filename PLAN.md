# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/mobile-announcement-feed`
- **Goal:** Make organizer/admin announcements persistently visible in the mobile app for all relevant roles.

## Architectural Decisions

- Update the Supabase read helper so feed announcements are readable even when they are not popups.
- Preserve popup behavior by keeping `show_as_popup = true` inside `fetchActiveAnnouncementsAsync`.
- Add a role-agnostic `useAnnouncementFeedQuery` that reads active published announcements plus the current user's acknowledgement rows.
- Treat acknowledgements as read receipts in the feed instead of filtering those rows away.
- Add a compact reusable feed section component with title/body/source/date/read state, CTA, mark-read, refresh, empty and error states.
- Embed the same section in student profile, business home, and club home to avoid adding another crowded tab.

## Edge Cases

- Users who dismissed a popup still see the announcement in feed with a read marker.
- Announcements with future `starts_at`, expired `ends_at`, draft, or archived status remain hidden by both query and RLS.
- Platform announcements have no club source; club announcements show the club name.
- If a CTA URL exists, it opens only after the user taps the CTA.

## Validation Plan

- Run:
  - `supabase db push`
  - `supabase migration list --linked`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
