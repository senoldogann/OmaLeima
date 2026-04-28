# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-platform-oversight`
- **Scope:** Phase 5 system-admin oversight surface for platform-wide clubs, events, audit logs, and fraud signals.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/admin/*`
- `apps/admin/src/features/oversight/*`
- `apps/admin/src/features/dashboard/*`
- `apps/admin/scripts/*`
- `docs/*`

## Risks

- Oversight reads must not widen any RLS boundary. Admin should see the full operational surface, while organizer or student sessions must still be gated away from the route. Data-level smoke should distinguish truly admin-only tables from event-scoped fraud visibility that club staff can legitimately read.
- `audit_logs` and `fraud_signals` are not seeded today, so the slice needs deterministic fixture generation for smoke without weakening runtime auth assumptions.
- The page should stay useful under growing volume: latest lists, summary cards, and bounded panels are fine, but silent truncation without any visible limit context would hide operational risk.
- CI and smoke posture is still thin at repo level, so this slice should leave explicit app-local oversight smoke coverage, not just visual route rendering.
- Documentation should stay deployment-aware: local app run, route scope, required function dependency, and next GTM/admin rollout steps must remain obvious.

## Dependencies

- Existing `clubs`, `events`, `audit_logs`, and `fraud_signals` tables plus their admin-facing RLS policies.
- Existing seeded admin, organizer, club, business, and event rows from `supabase/seed.sql`.
- Existing write paths that already generate audit logs, plus direct local fixture seeding for smoke where necessary.
- Existing seeded `PLATFORM_ADMIN`, `CLUB_ORGANIZER`, and `STUDENT` accounts for auth-backed smoke.
- Current `apps/admin` SSR auth foundation and role-gated `/admin` route.
- Official Next.js App Router guidance already adopted in this app, plus current Supabase query and RLS behavior.

## Existing Logic Checked

- `audit_logs` are admin-only under RLS, while `fraud_signals` are also readable by club staff for events they manage. Smoke fixtures still need direct local DB seeding because there is no app write path for deterministic oversight-only records.
- `clubs` and `events` already have enough seeded records to power a real oversight dashboard without inventing placeholder content.
- `DashboardShell` and route guards already exist, so the new review route should extend the same admin surface instead of creating a parallel layout.
- Existing app-local smoke scripts cover auth, route gating, and business-application review; they do not yet cover oversight data visibility.

## Review Outcome

Add a dedicated `/admin/oversight` route, load platform-wide clubs, events, audit logs, and open fraud signals through the authenticated admin session, extend navigation, and leave stronger smoke coverage for audit RLS, event-scoped fraud visibility, and oversight route rendering.
