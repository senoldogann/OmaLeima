# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-official-department-tags`
- **Scope:** Phase 5 club-side official department tag creation flow.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/README.md`
- `apps/admin/src/app/club/*`
- `apps/admin/src/app/api/club/*`
- `apps/admin/src/features/club-*/*`
- `apps/admin/src/features/dashboard/*`
- `apps/admin/scripts/*`
- `supabase/migrations/*`

## Risks

- The current `department_tags` insert policy allows any club staff member to create official tags directly. That is broader than the product plan, which calls for organizer-level ownership.
- Official tags are public catalog records. A weak create path could pollute the tag list with duplicates or low-quality labels.
- Student custom tag creation already exists and must keep working. Any policy tightening must not break the mobile student profile flow.
- Club users may belong to multiple clubs. The route must scope create actions to active organizer or owner memberships only.
- Department tag creation is not a heavy transaction, but concurrent duplicate attempts from the same club should converge cleanly instead of producing unstable unique-slug failures.
- Repo-level CI is still thin, so this slice needs strong smoke coverage for route access, organizer success, staff denial, duplicate prevention, RLS direct-write blocking, and cleanup isolation.

## Dependencies

- Existing `department_tags` schema, triggers, and profile-link sync logic.
- Existing admin moderation flow in `apps/admin/src/features/department-tags/*`.
- Existing club SSR auth foundation and organizer access model in `apps/admin`.
- Existing organizer-only route-backed patterns from `/club/events` and `/club/rewards`.
- Existing seeded admin, organizer, and club data from `supabase/seed.sql`.

## Existing Logic Checked

- `department_tags` already normalizes title and slug, enforces source-type rules, and keeps merged or blocked tags out of active profile usage.
- Admin moderation already provides merge and block operations, so this slice only needs to open the club-side create path.
- `fetchClubEventContextAsync` already tells us which memberships have organizer-level authority via `canCreateEvents`.
- Student mobile profile already reads active department tags and creates custom `USER` tags directly; that flow must stay untouched.
- Current club admin slices already follow a route-backed mutation pattern with app-local smokes and fixture cleanup we can reuse.

## Review Outcome

Add a dedicated club department-tag workflow that lets organizers:

- open an organizer-only official tag panel
- create official `CLUB` source tags for their own community
- keep student custom tags and admin moderation flows intact
- tighten the write boundary so direct club-side inserts no longer bypass the intended route
- leave repeatable smoke coverage for access control, duplicate handling, and cleanup isolation
