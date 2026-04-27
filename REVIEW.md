# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-leaderboard`
- **Scope:** Phase 3 student leaderboard tab with event-scoped Top 10 and current-user rank visibility.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/features/events/*`
- `apps/mobile/src/features/leaderboard/*`
- `apps/mobile/src/components/*`

## Risks

- The tab should not trigger one leaderboard RPC per event in a loop; we need a scoped selection model that keeps requests bounded.
- `get_event_leaderboard` is event-scoped and async refreshed, so the UI must tolerate stale or empty scoreboards without implying a backend failure.
- Student-visible leaderboard data comes from a security-definer RPC, while event discovery still uses RLS-constrained reads; those two surfaces need consistent empty-state handling.
- The current profile schema does not expose department tags yet, so leaderboard cards should not promise primary-tag rendering in this slice.
- Seed data has only one student score by default, so meaningful Top 10 validation requires local fixture rows.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for event-scoped leaderboard fetch and student leaderboard visibility.
- Existing `apps/mobile` auth foundation and route guard merged in Phase 3.
- Existing `get_event_leaderboard` RPC, async leaderboard refresh job, and event registration reads in Supabase.

## Existing Logic Checked

- `apps/mobile` already has session bootstrap, route protection, and sign-out, so the events screen can assume authenticated access.
- The current leaderboard tab is still a placeholder shell with no event selection, no RPC read, and no own-rank surface.
- `student/events` already knows how to derive active versus upcoming public events for a student session, which is the closest existing pattern for selecting a relevant event scope.
- `get_event_leaderboard` already returns exactly the two core payloads we need: `top10` and `currentUser`.
- Leaderboard aggregation is already asynchronous through `scheduled-leaderboard-refresh`, so the mobile slice only needs read-only event selection and clear freshness messaging.

## Review Outcome

Implement an event-scoped leaderboard read surface in `apps/mobile`: let the student choose among registered public events, fetch one selected event leaderboard at a time through `get_event_leaderboard`, and show Top 10 plus the current student's own rank with clear empty and stale-data states.
