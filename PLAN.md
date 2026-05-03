# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/business-event-timeline-visibility`
- **Goal:** Make live/upcoming/manage event visibility reliable for business and scanner roles.

## Architectural Decisions

- Keep the shared business overview query as the single source for business home, events, profile, and scanner screens.
- Change timeline derivation to treat both `PUBLISHED` and `ACTIVE` events as live when the current time is inside `start_at` and `end_at`.
- Keep completed/cancelled events out of active/upcoming scanner surfaces.
- Fetch joinable city opportunities for both `PUBLISHED` and `ACTIVE`, but only before `start_at` and `join_deadline_at`.
- Add a modest refresh interval to the business overview query so an already-open scanner screen can move from upcoming to live without app restart.

## Edge Cases

- Event status is `PUBLISHED`, time window is live: scanner should list it.
- Event status is `ACTIVE`, start is still future: business can still see it as upcoming and joinable until deadline/start.
- Event status is `PUBLISHED` or `ACTIVE`, start has passed: it is no longer joinable unless already joined.
- Staff keeps the app open at event start: overview refetch should promote the event into scanner queue.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
