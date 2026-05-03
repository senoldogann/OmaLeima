# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/business-event-timeline-visibility`
- **Scope:** Ensure business/scanner accounts see live, upcoming, and joinable events correctly.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/business/business-home.ts`

## Existing Logic Checked

- Business home, business events, business profile counters, and scanner route all read from `useBusinessHomeOverviewQuery`.
- Scanner route only scans `joinedActiveEvents`; if an event is not classified as active there, the scanner has no event context.
- Student event discovery derives active/upcoming from timestamps for both `PUBLISHED` and `ACTIVE` events.
- `join_business_event_atomic` allows joining only before `start_at` and `join_deadline_at`, and accepts event status `PUBLISHED` or `ACTIVE`.
- Current business timeline logic requires database `status = ACTIVE` for a live event, so a time-live `PUBLISHED` event can disappear from business/scanner live lists.

## Risks

- Do not make completed/cancelled events scan-enabled.
- Do not show events as joinable after `start_at`; the RPC rejects that anyway.
- Avoid stale open-screen state when an upcoming event becomes live while staff keeps the app open.
- Keep scanner permissions unchanged; this slice is visibility/timeline only.

## Review Outcome

Align business timeline derivation with student visibility and backend join rules: `PUBLISHED` and `ACTIVE` events become live by time window, joinable opportunities include both statuses only before start/deadline, and the overview query refreshes while the business area is open.
