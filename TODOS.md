# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Current Todos

- [x] Create `feature/admin-club-official-department-tags` branch.
- [x] Review the current department-tag schema, club access boundaries, and existing moderation flow.
- [x] Update `REVIEW.md` for the official club department-tag scope.
- [x] Update `PLAN.md` for the official club department-tag scope.
- [x] Update `TODOS.md` with small implementation steps.
- [x] Add an organizer-only database path for official club department tag creation.
- [x] Tighten direct `CLUB` tag writes so staff or browser clients cannot bypass the route-backed path.
- [x] Add a bounded club department-tag read model plus organizer-only `/club/department-tags` route.
- [x] Extend club dashboard navigation and sections for the new workflow.
- [x] Add app-local smoke coverage for organizer success, staff denial, duplicate handling, and cleanup isolation.
- [x] Run admin validation commands plus new tag smokes.
- [x] Update `README.md`, `PROGRESS.md`, and any docs touched by the new route.
- [x] Review diff and reviewer findings.
- [ ] Commit, push, PR, merge, and branch cleanup.
