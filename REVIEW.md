# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-business-applications-review`
- **Scope:** Phase 5 platform admin review queue for pending business applications, wired to existing approval and rejection backend flows.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/admin/*`
- `apps/admin/src/features/business-applications/*`
- `apps/admin/src/features/dashboard/*`
- `apps/admin/scripts/*`
- `docs/*`

## Risks

- Pending application reads must stay behind admin-only RLS. Club, business, or student sessions must not see queue data.
- Approve and reject actions must reuse the existing Edge Functions so the web panel does not fork business rules or bypass atomic review RPCs.
- Review UI must stay deterministic under concurrent admin clicks. If another admin resolves the same application first, the web panel should surface `APPLICATION_NOT_PENDING` or similar status cleanly instead of assuming success.
- CI and smoke posture is still thin at repo level, so this slice should leave explicit app-local review-flow smoke coverage, not just route rendering.
- Documentation should stay deployment-aware: local app run, route scope, required function dependency, and next GTM/admin rollout steps must remain obvious.

## Dependencies

- Existing `business_applications` table plus admin-only RLS policy.
- Existing `admin-approve-business` and `admin-reject-business` Edge Functions backed by atomic review RPCs.
- Existing seeded `PLATFORM_ADMIN`, `CLUB_ORGANIZER`, and `STUDENT` accounts for auth-backed smoke.
- Current `apps/admin` SSR auth foundation and role-gated `/admin` route.
- Official Next.js App Router guidance for client boundaries and server mutations, plus current Supabase function invocation behavior.

## Existing Logic Checked

- `public.business_applications` already has a public-facing create policy plus full admin management policy. For deterministic smoke, this branch seeds reviewable rows through the admin session and then verifies non-admin visibility stays blocked.
- Approval and rejection domain rules already live in `admin-approve-business` and `admin-reject-business`; this branch should only bind UI and auth-safe invocation.
- `DashboardShell` and route guards already exist, so the new review route should extend the same admin surface instead of creating a parallel layout.
- Existing app-local smoke scripts cover auth and route gating, but not review-flow reads or mutations yet.

## Review Outcome

Add a dedicated `/admin/business-applications` route, load pending and recently reviewed applications through the authenticated admin session, bind approve and reject controls to the existing Edge Functions, extend navigation, and leave stronger smoke coverage for RLS visibility and review mutations.
