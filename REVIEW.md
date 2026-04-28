# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/phase-6-leaderboard-load-and-event-day-runbook`
- **Scope:** Phase 6 leaderboard load validation plus event-day, fallback, and launch runbook documentation.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `README.md`
- `apps/admin/README.md`
- `apps/admin/package.json`
- `apps/admin/scripts/*`
- `docs/EDGE_FUNCTIONS.md`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`
- `tests/*`
- root `package.json`

## Risks

- Load validation is easy to fake. If the harness seeds too little data or only checks that the function returns 200, we will miss real leaderboard aggregation pressure.
- The local API stack truncates large row reads. Any leaderboard freshness logic that pulls raw `stamps` rows through PostgREST can silently miss late stamps once the event volume crosses the API row cap.
- Overly strict timing assertions would make the test flaky across developer machines. We need a bounded but realistic timeout, plus persistent data checks.
- Seeding thousands of rows without deterministic cleanup can pollute the local DB and make later smokes meaningless.
- Event-day and fallback docs can rot quickly if they duplicate implementation details instead of pointing at concrete commands and current operational states.
- Launch and GTM guidance should stay aligned with the actual product we have now, not an imagined future stack.

## Dependencies

- Existing admin smoke scripts in `apps/admin/scripts`.
- Existing local Supabase reset flow, local function server flow, and seeded accounts.
- `scheduled-leaderboard-refresh`, `update_event_leaderboard`, and `get_event_leaderboard`.
- Existing function-backed smoke helpers under `apps/admin/scripts/_shared`.
- Existing feature-level docs in `apps/admin/README.md`, `docs/EDGE_FUNCTIONS.md`, and `docs/TESTING.md`.
- Master plan sections 23.4 and 29 for load scenarios and production readiness.

## Existing Logic Checked

- `scheduled-leaderboard-refresh` already compares latest valid stamp timestamps with `leaderboard_updates.updated_at`, then refreshes only dirty events.
- The original refresh path derived `max(scanned_at)` in memory from raw API rows. Under the local row cap, that shape can miss the newest stamp for large events.
- `update_event_leaderboard` aggregates `VALID` stamps into `leaderboard_scores` and bumps `leaderboard_updates.version`.
- Current Phase 6 smokes cover RLS, JWT abuse, and replay protection, but not the leaderboard load scenario from the master plan.
- `smoke:business-applications` performs multiple sequential route-backed mutations with one cookie-backed client, so response cookie propagation must remain intact across approve and reject calls.
- There is no current repo doc that combines production readiness, event-day checklist, manual fallback format, and first-launch GTM guidance into one operational runbook.

## Review Outcome

Build the next Phase 6 readiness slice that:

- adds a leaderboard load smoke that seeds a realistic event dataset, invokes the async refresh path, and verifies stable read-model results
- fixes the real load bug the smoke exposed by moving freshness detection to a DB aggregate helper instead of a capped raw row fetch
- keeps sequential route-backed business review smoke stable by persisting updated cookies between requests
- adds a root readiness runner for the heavier load validation tier
- adds a single launch runbook that covers production readiness, event-day checklist, manual fallback, and first-launch GTM guidance
- keeps the assertions focused on real persistence and operational readiness instead of vanity timing numbers
