# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/leaderboard-refresh-job`
- **Scope:** Phase 2 asynchronous leaderboard refresh cron job.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/EDGE_FUNCTIONS.md`
- `docs/DATABASE.md`
- `supabase/config.toml`
- `supabase/functions/_shared/env.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/scheduled.ts`
- `supabase/functions/scheduled-event-reminders/index.ts`
- `supabase/functions/scheduled-leaderboard-refresh/index.ts`

## Risks

- Leaderboard refresh must stay asynchronous and avoid adding contention back into the scan flow.
- Scheduled functions should not be callable by arbitrary public clients.
- The refresh job should not full-scan irrelevant historical events on every cron run.
- Events with no new valid stamps since the last refresh should be skipped deterministically.
- The job should update the same leaderboard state that mobile clients already read through `get_event_leaderboard`.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` asynchronous leaderboard and cron sections.
- Existing `stamps`, `events`, `leaderboard_scores`, and `leaderboard_updates` tables.
- Existing `update_event_leaderboard` and `get_event_leaderboard` RPC functions.
- Existing scheduled secret pattern introduced for `scheduled-event-reminders`.

## Existing Logic Checked

- `scan_stamp_atomic` no longer updates leaderboard synchronously by design.
- `update_event_leaderboard(p_event_id)` already rebuilds one event leaderboard and bumps `leaderboard_updates.version`.
- `leaderboard_scores` only stores `EVENT` scope in the current implementation.
- No scheduled Edge Function exists yet for leaderboard refresh.

## Review Outcome

Implement the remaining Phase 2 cron slice with one scheduled leaderboard refresh function: secure scheduled invocation, dirty-event detection from valid stamps versus `leaderboard_updates`, and controlled per-event RPC refresh execution.
