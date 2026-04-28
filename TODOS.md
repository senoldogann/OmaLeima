# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Current Todos

- [x] Create `feature/admin-club-event-creation` branch.
- [x] Review the club dashboard foundation, event schema, RLS, and existing seed coverage.
- [x] Update `REVIEW.md` for the club event creation scope.
- [x] Update `PLAN.md` for the club event creation scope.
- [x] Update `TODOS.md` with small implementation steps.
- [x] Add an atomic club event creation backend path with slug collision handling, concurrency-safe retry, and audit logging.
- [x] Add a dedicated `/club/events` route with organizer club selection, creation form, and recent-event visibility.
- [x] Extend club navigation and dashboard linkage so the events screen is reachable from the existing shell.
- [x] Add app-local smoke coverage for route visibility, organizer-only creation, validation boundaries, created-event visibility, and concurrent create isolation.
- [x] Run admin validation commands plus club event creation smoke tests.
- [x] Update `README.md`, `PROGRESS.md`, and any docs touched by the new route.
- [x] Review diff and reviewer findings.
- [ ] Commit, push, PR, merge, and branch cleanup.
