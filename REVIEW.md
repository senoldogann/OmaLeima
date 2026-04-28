# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-event-creation`
- **Scope:** Phase 5 club organizer event-creation surface in the admin web app.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/admin/*`
- `apps/admin/src/app/club/*`
- `apps/admin/src/app/api/club/events/*`
- `apps/admin/src/features/club-events/*`
- `apps/admin/src/features/dashboard/*`
- `apps/admin/scripts/*`
- `supabase/migrations/*`
- `docs/*`

## Risks

- Event creation must stay atomic. Slug generation, club ownership checks, and audit logging should happen in one backend-owned write path so concurrent organizer submissions do not leave duplicate or partial rows behind.
- App-local smoke scripts share one local DB. Club-event smoke must clean up created fixtures or it will silently break later oversight and moderation route assertions.
- Club write access must not widen RLS. Organizer or owner sessions should be able to create events only for clubs they actively manage, while student, business, or unrelated club sessions must fail closed.
- A user can hold multiple active club memberships. The route cannot silently assume a single club or risk creating events under the wrong owner context.
- CI and smoke posture is still thin at repo level, so this slice should leave explicit app-local creation smoke coverage, not just route rendering.
- Documentation should stay deployment-aware: local app run, route scope, required function dependency, and next GTM/admin rollout steps must remain obvious.

## Dependencies

- Existing `events` table, event RLS policies, `club_members`, `clubs`, and `audit_logs`.
- Existing seeded organizer, club, and event rows from `supabase/seed.sql`.
- Existing mobile event read models that already depend on event fields such as `visibility`, `join_deadline_at`, `minimum_stamps_required`, and `rules`.
- Existing seeded `PLATFORM_ADMIN`, `CLUB_ORGANIZER`, and `STUDENT` accounts for auth-backed smoke.
- Current `apps/admin` SSR auth foundation and role-gated `/admin` route.
- Official Next.js App Router guidance already adopted in this app, plus current Supabase query, RPC, and RLS behavior.

## Existing Logic Checked

- Event reads and writes already have club-scoped RLS, but there is no club web write surface yet.
- `DashboardShell` and club route guards already exist, so the new organizer route should extend the same club surface instead of creating a parallel layout.
- Existing app-local smoke scripts cover auth, route gating, admin moderation, and oversight visibility; they do not yet cover club event creation.
- Existing admin UUID route validation was stricter than the backend shared validator and rejected deterministic seeded IDs. Club event validation needs to stay aligned with the wider project seed strategy.

## Review Outcome

Add a dedicated `/club/events` route, load organizer-accessible clubs plus recent events through the authenticated club session, back event creation with an atomic club-safe write path, extend club navigation, and leave stronger smoke coverage for organizer-only creation, validation boundaries, created-event visibility, concurrency, and smoke isolation.
