# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/announcement-preferences-analytics`
- **Scope:** Add source-level announcement push preferences and lightweight feed impression analytics.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/announcements/announcements.ts`
- `apps/mobile/src/features/announcements/announcement-feed-section.tsx`
- `supabase/functions/send-announcement-push/index.ts`
- `supabase/migrations/20260504004359_announcement_preferences_analytics.sql`

## Existing Logic Checked

- Persistent mobile feed exists and reads active announcements through RLS.
- `announcement_acknowledgements` currently represents read/dismiss state.
- `send-announcement-push` resolves recipients by announcement audience and sends to all enabled device tokens.
- No source-level mute/unmute preference exists for platform or club announcements.
- No lightweight feed impression table exists, so read receipts are not separated from passive feed views.

## Risks

- Push preference filtering must not weaken audience authorization.
- Missing preference rows should mean enabled so existing users keep receiving opted-in pushes.
- Impression writes must verify the announcement is readable and must not block feed rendering.
- Club source preference must not accidentally mute platform announcements.

## Review Outcome

Add `announcement_notification_preferences` and `announcement_impressions` with user-owned RLS, update push fan-out to honor disabled source preferences, and let mobile feed record impressions plus expose a compact mute/unmute source action.
