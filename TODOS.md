# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Current Todos

- [x] Create `feature/admin-business-applications-review` branch.
- [x] Review the admin app foundation, business application schema, RLS, and existing approval or rejection backend contracts.
- [x] Update `REVIEW.md` for the business application review scope.
- [x] Update `PLAN.md` for the business application review scope.
- [x] Update `TODOS.md` with small implementation steps.
- [x] Add a dedicated `/admin/business-applications` route and server-side read model for pending plus recently reviewed applications.
- [x] Add admin review controls that approve or reject through the existing Edge Functions and handle stale-review responses cleanly.
- [x] Extend admin navigation and dashboard linkage so the new review queue is reachable from the existing shell.
- [x] Add app-local smoke coverage for queue visibility, route protection, and approve or reject flow.
- [x] Run admin validation commands plus review-flow smoke tests.
- [x] Update `README.md`, `PROGRESS.md`, and any admin docs touched by the new route.
- [x] Review diff.
- [ ] Commit, push, PR, merge, and branch cleanup.
