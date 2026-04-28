# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Current Todos

- [x] Create `feature/phase-6-leaderboard-load-and-event-day-runbook` branch.
- [x] Review current leaderboard refresh path, load-test gaps, and runbook requirements.
- [x] Update `REVIEW.md` for the load and runbook scope.
- [x] Update `PLAN.md` for the leaderboard load and readiness scope.
- [x] Update `TODOS.md` with small implementation steps.
- [x] Add `smoke:leaderboard-load` with realistic fixture volume and async refresh assertions.
- [x] Fix the leaderboard freshness path to use a DB aggregate instead of a capped raw stamp fetch.
- [x] Stabilize sequential admin review smoke by persisting response cookies in the route-backed client.
- [x] Add a root readiness QA entry point for the load tier.
- [x] Add a launch runbook with production readiness, event-day checklist, manual fallback, and GTM guidance.
- [x] Update testing and function docs for the load tier and runbook.
- [x] Run direct load validation and full readiness validation.
- [ ] Update `PROGRESS.md` with the Phase 6 load/runbook outcome.
- [ ] Review diff and reviewer findings.
- [ ] Commit, push, PR, merge, and branch cleanup.
