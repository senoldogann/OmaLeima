# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/announcement-preferences-analytics`
- **Goal:** Make announcement push delivery user-respectful and add lightweight feed view analytics.

## Architectural Decisions

- Add a user-owned source preference table keyed by `PLATFORM` or a specific `CLUB`.
- Default missing preference rows to push enabled so existing behavior remains intact.
- Add a separate impressions table for passive feed visibility; keep acknowledgements as explicit read/dismiss state.
- Update `send-announcement-push` to filter recipients after audience resolution and before device-token fan-out.
- Extend the mobile feed query with source preference state and expose one compact source mute/unmute action per card.
- Record impressions for visible feed items with a non-blocking mutation.

## Edge Cases

- If a user has no preference row for the source, push remains enabled.
- Platform and club preferences are independent.
- Impression recording is idempotent with `seen_count` and last-seen updates.
- Push sending reports skipped users due to disabled source preferences in the audit metadata and response.

## Validation Plan

- Run:
  - `supabase db push`
  - `supabase migration list --linked`
  - `npx supabase@2.95.4 functions deploy send-announcement-push`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
