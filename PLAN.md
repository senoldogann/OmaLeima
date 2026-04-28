# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/phase-6-leaderboard-load-and-event-day-runbook`
- **Goal:** Close the remaining practical Phase 6 gap with leaderboard load validation and a concrete launch/event-day runbook.

## Architectural Decisions

- Keep the new load validation in `apps/admin/scripts/` so it can reuse the existing function smoke helper and `tsx` runtime.
- Seed one isolated event with multiple joined venues, 1000 students, and 5000 valid stamps to match the master-plan load scenario without touching the seeded base event.
- Drive the async path through `scheduled-leaderboard-refresh` instead of calling `update_event_leaderboard` directly. That tests the real freshness detection path we ship.
- If the load smoke exposes refresh drift, fix the product path instead of weakening the smoke. In practice that means moving freshness detection to a DB aggregate helper, not paging through raw stamp rows in the function.
- Use a generous timeout and persistence assertions rather than machine-specific TPS thresholds:
  1. one dirty event updated
  2. 1000 `leaderboard_scores` rows created
  3. `leaderboard_updates.version` initialized, then incremented on the second pass only after new stamps
  4. second pass without new stamps reports already-fresh
- Add a new root `qa:phase6-readiness` runner that preflights the function server, runs the expanded matrix, then runs the leaderboard load smoke.
- Keep sequential route-backed admin review smoke resilient by hydrating `Set-Cookie` response updates back into the local cookie jar between approve and reject calls.
- Add one runbook doc instead of scattering operations knowledge across multiple small files.

## Alternatives Considered

- Using `pgbench` in this slice: useful later, but rejected for now because we first need a deterministic repo-local readiness harness that matches our domain data model.
- Asserting very tight wall-clock numbers: rejected because that will be flaky across laptops and doesn’t reflect hosted production characteristics.
- Splitting event-day, fallback, and launch guidance into separate documents: rejected because the operational audience needs one place to look during a real event week.
- Skipping the async refresh function and only testing the SQL RPC: rejected because the actual shipped path is the scheduled Edge Function.
- Keeping the dirty refresh follow-up on a raw SQL stamp insert only: rejected because the more trustworthy event-day path is a real `generate-qr-token` plus `scan-qr` flow for the extra dirty stamp.

## Edge Cases

- The load harness must not accidentally count invalid or revoked stamps; all seeded fixture stamps should be explicit `VALID`.
- The second scheduled refresh pass must prove freshness skipping before we add extra stamps for the version bump case.
- Fixture cleanup must remove large auth/profile/business/event datasets safely, or later local runs will slow down and skew results.
- The runbook should include manual fallback data shape that matches the fields we can actually export or derive now.
- Deployment and GTM advice must stay conservative: dev/staging/prod separation, secrets, app store readiness, pilot event metrics, and rollback path.

## Validation Plan

- Run direct load validation while developing:
  1. `rtk supabase db reset --yes`
  2. `rtk supabase functions serve --env-file supabase/.env.local`
  3. `cd apps/admin && rtk npm run smoke:leaderboard-load`
- Run full readiness validation:
  1. `rtk npm run qa:phase6-expanded`
  2. `rtk npm run qa:phase6-readiness`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`, `README.md`, `apps/admin/README.md`, `docs/EDGE_FUNCTIONS.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md`.
