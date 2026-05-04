# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `bug/club-event-date-constraints`
- **Scope:** Fix organizer event date picker off-by-one behavior and replace raw event constraint errors with explicit client validation.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/club/events.tsx`
- `apps/mobile/src/features/club/club-event-mutations.ts`

## Existing Logic Checked

- Organizer event calendar dates are generated with `Date#toISOString().slice(0, 10)`.
- In Europe/Helsinki, local midnight converted to UTC can become the previous calendar day, which explains selecting 4 and seeing 3.
- Event update path writes directly to `events`; if `end_at <= start_at` or `join_deadline_at > start_at`, Postgres returns a raw check constraint error.
- Initial schema shows unnamed event checks: `end_at > start_at` and `join_deadline_at <= start_at`; the reported `events_check1` maps to the join deadline relation in hosted DB naming.

## Risks

- Date utilities must stay local-date based for the calendar grid while mutation payloads still convert local datetime to ISO for Supabase.
- Manual date/time text inputs can still be invalid; mutation validation should fail before DB writes.
- Join deadline equal to start is allowed by DB, but after start is not.

## Review Outcome

Replace ISO slicing with local date formatting for organizer calendar days/months and add explicit temporal validation before create/update RPC/table writes.
