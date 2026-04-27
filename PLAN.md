# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/leaderboard-refresh-job`
- **Goal:** Implement the remaining Phase 2 cron job for asynchronous leaderboard refresh.

## Architectural Decisions

- Keep leaderboard refresh in a dedicated Edge Function invoked by cron so stamp scanning remains write-light.
- Reuse the same scheduled job secret pattern as reminder jobs, but extract the auth check into one shared helper.
- Detect dirty events by comparing the latest valid stamp time with `leaderboard_updates.updated_at`.
- Limit candidate events to statuses `PUBLISHED`, `ACTIVE`, and `COMPLETED`, with a recent `end_at` window to avoid sweeping distant history every run.
- Refresh each dirty event by calling the existing `update_event_leaderboard` RPC instead of rewriting aggregation logic in TypeScript.
- Return a compact summary with candidate, updated, skipped, and failed counts for cron observability.

## Alternatives Considered

- Recomputing all leaderboards on every cron run: rejected because it scales poorly as event history grows.
- Updating leaderboard rows directly inside the Edge Function: rejected because the aggregation logic already exists safely in `update_event_leaderboard`.
- Moving leaderboard refresh back into `scan_stamp_atomic`: rejected because the master plan explicitly removed synchronous leaderboard writes to avoid lock contention.

## Edge Cases

- Missing or invalid scheduled job secret.
- No events currently need a refresh.
- Event has stamps but no existing `leaderboard_updates` row yet.
- Event already refreshed and no new valid stamp exists.
- One event refresh fails while others succeed.
- Completed event still needs one late refresh after the event ends.

## Validation Plan

- Run `supabase db reset`.
- Start `supabase functions serve`.
- Generate a QR token for the seeded student and scan it with the seeded scanner to create one valid stamp.
- Call `scheduled-leaderboard-refresh` with an invalid secret and verify it fails safely.
- Call `scheduled-leaderboard-refresh` with the valid secret and verify the event leaderboard is created or updated.
- Call the same function again and verify the already-fresh event is skipped.
- Verify `leaderboard_scores` and `leaderboard_updates` rows through the database.
