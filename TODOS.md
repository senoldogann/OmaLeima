# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Current Todos

- [x] Create `feature/admin-club-reward-tier-management` branch.
- [x] Review the club reward tier foundation, claim semantics, RLS, and existing seed coverage.
- [x] Update `REVIEW.md` for the club reward tier scope.
- [x] Update `PLAN.md` for the club reward tier scope.
- [x] Update `TODOS.md` with small implementation steps.
- [x] Add safe backend write paths for club reward tier create and update plus organizer-only RLS tightening.
- [x] Add a dedicated `/club/rewards` route with event selection, tier creation, stock visibility, and tier editing.
- [x] Extend club navigation and dashboard linkage so the rewards screen is reachable from the existing shell.
- [x] Add app-local smoke coverage for route visibility, organizer-only writes, claimed-stock boundaries, and cleanup isolation.
- [x] Run admin validation commands plus club reward tier smoke tests.
- [x] Update `README.md`, `PROGRESS.md`, and any docs touched by the new route.
- [x] Review diff and reviewer findings.
- [ ] Commit, push, PR, merge, and branch cleanup.
