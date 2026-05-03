# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/business-active-event-membership-fix`
- **Goal:** Make business event lists explain live/upcoming/past state correctly and prepare a real live scanner smoke event.

## Architectural Decisions

- Keep scanner queue strictly `joinedActiveEvents`.
- Add `joinedCompletedEvents` to the shared business overview read model so business home/events can show ended joined events separately.
- Keep home concise: live/upcoming summary plus a small past count.
- On `/business/events`, show a dedicated past joined section below upcoming/joinable sections with no scan CTA.
- Seed a current hosted smoke event by service-role script command, not by loosening app rules.

## Edge Cases

- Event status is `ACTIVE` but `end_at` has passed: it appears under past joined, not scanner.
- Event status is `PUBLISHED` and live by time: it appears in scanner if joined.
- Future event in another city: not shown as an opportunity for a business in Helsinki.
- Joined venue is `LEFT` or `REMOVED`: it remains excluded from scanner and joined lists.

## Validation Plan

- Run:
  - Hosted data check/create live scanner smoke event.
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
