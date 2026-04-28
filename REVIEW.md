# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-department-tag-moderation`
- **Scope:** Phase 5 system-admin moderation surface for duplicate or custom department tags, including merge and block flows.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/admin/*`
- `apps/admin/src/features/department-tags/*`
- `apps/admin/src/app/api/admin/department-tags/*`
- `apps/admin/src/features/dashboard/*`
- `apps/admin/scripts/*`
- `supabase/migrations/*`
- `docs/*`

## Risks

- Merge and block actions must stay atomic. A duplicate tag can be attached to profiles while an admin is moderating it, so the chosen backend path must preserve the existing repair triggers and avoid partial state under concurrent writes.
- Admin moderation must not widen RLS. Non-admin sessions should continue to see only active tags, and route-backed mutations must fail closed for organizer or student sessions.
- Department tags are already user-facing in mobile. Blocking or merging a tag can remove or rewrite profile links, so the UI and smoke coverage need to prove that side effects are deliberate and stable.
- CI and smoke posture is still thin at repo level, so this slice should leave explicit app-local moderation smoke coverage, not just route rendering.
- Documentation should stay deployment-aware: local app run, route scope, required function dependency, and next GTM/admin rollout steps must remain obvious.

## Dependencies

- Existing `department_tags` and `profile_department_tags` tables, their triggers, and admin-facing RLS policies.
- Existing seeded admin, organizer, student, club, and department-tag rows from `supabase/seed.sql`.
- Existing mobile profile flow that reads active tags and manages self-selected profile links.
- Existing seeded `PLATFORM_ADMIN`, `CLUB_ORGANIZER`, and `STUDENT` accounts for auth-backed smoke.
- Current `apps/admin` SSR auth foundation and role-gated `/admin` route.
- Official Next.js App Router guidance already adopted in this app, plus current Supabase query, RPC, and RLS behavior.

## Existing Logic Checked

- `department_tags` normalization and profile-link repair already live in database triggers, so moderation should reuse DB-owned invariants instead of copying them in web code.
- RLS already allows platform admins to manage department tags broadly, while non-admin sessions can only read active tags or self-manage their own profile links.
- `DashboardShell` and route guards already exist, so the new moderation route should extend the same admin surface instead of creating a parallel layout.
- Existing app-local smoke scripts cover auth, route gating, business-application review, and oversight visibility; they do not yet cover department-tag moderation.

## Review Outcome

Add a dedicated `/admin/department-tags` route, load pending, active custom, and recently moderated department tags through the authenticated admin session, back merge or block actions with atomic admin-safe write paths, extend navigation, and leave stronger smoke coverage for non-admin RLS, merge or block outcomes, and profile-link repair.
