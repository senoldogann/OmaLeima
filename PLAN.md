# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `bug/club-event-date-constraints`
- **Goal:** Make organizer event date selection calendar-safe in local time and prevent raw `events_check1` constraint failures.

## Architectural Decisions

- Add local calendar date formatting helper that never uses UTC ISO conversion for date-only values.
- Use the helper for month start fallback, month shifting, and calendar day generation.
- Keep datetime mutation conversion through local `new Date(YYYY-MM-DDTHH:mm)` so stored `timestamptz` stays correct.
- Add parsed temporal validation in `club-event-mutations`: `endAt > startAt` and `joinDeadlineAt <= startAt`.
- Return clear actionable errors before Supabase writes.

## Edge Cases

- Selecting day 4 must store day 4, including in positive timezones.
- Month navigation must not drift across DST/month boundaries.
- Manual invalid date or time still raises a validation error.
- Join deadline at the exact start time remains valid because DB allows equality.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
