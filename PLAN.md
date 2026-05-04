# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/mobile-announcement-feed-routes`
- **Goal:** Give students and business users a real mobile announcement feed screen without changing the trusted backend model.

## Architectural Decisions

- Reuse `AnnouncementFeedSection` for compact and full feed surfaces.
- Add optional `onViewAllPress` and `viewAllLabel` props to the shared component instead of duplicating feed cards.
- Add `/student/updates` as a hidden tab route so it is navigable but not a bottom navigation item.
- Add `/business/updates` as a normal business stack route.
- Keep feed data, read state, impressions, CTA, and push preference behavior in the existing query/mutation module.

## Edge Cases

- Signed-out or missing session: `AnnouncementFeedSection` returns `null`, matching existing behavior.
- Empty feed: full and compact screens keep the same empty state.
- Student tab count: the updates route is explicitly hidden from tabs with `href: null`.
- Back navigation: update screens use deterministic role home/profile routes instead of `router.back()`.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
