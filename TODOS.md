# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Current Todos

- [x] Create `feature/admin-club-reward-distribution` branch.
- [x] Review the reward claim flow, club access boundaries, and current RLS coverage.
- [x] Update `REVIEW.md` for the reward distribution scope.
- [x] Update `PLAN.md` for the reward distribution scope.
- [x] Update `TODOS.md` with small implementation steps.
- [x] Add a bounded club claims read model for operational events, claimable reward candidates, and recent claims.
- [x] Add a route-backed claim confirmation action that uses the authenticated club session.
- [x] Add a dedicated `/club/claims` route and connect it to the club dashboard shell.
- [x] Extend navigation and sections so staff can reach the reward-claims workflow.
- [x] Add app-local smoke coverage for organizer and staff access, claim success, duplicate claims, low-stamp rejection, stock rejection, and cleanup isolation.
- [x] Run admin validation commands plus new claim smokes.
- [x] Update `README.md`, `PROGRESS.md`, and any docs touched by the new route.
- [x] Review diff and reviewer findings.
- [ ] Commit, push, PR, merge, and branch cleanup.
