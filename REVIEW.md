# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-reward-tier-management`
- **Scope:** Phase 5 club organizer reward-tier management surface in the admin web app.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/admin/*`
- `apps/admin/src/app/club/*`
- `apps/admin/src/app/api/club/reward-tiers/*`
- `apps/admin/src/app/club/rewards/*`
- `apps/admin/src/features/club-rewards/*`
- `apps/admin/src/features/dashboard/*`
- `apps/admin/scripts/*`
- `supabase/migrations/*`
- `docs/*`

## Risks

- Reward-tier writes must stay inventory-safe. Organizer edits cannot let `inventory_total` drop below already claimed stock or leave half-updated rows under concurrent claims.
- Existing reward-tier RLS is broader than this slice wants. `CLUB_STAFF` currently inherits manage access through `can_user_manage_event`, so direct table-write bypass needs to be closed for organizer-only configuration flows.
- App-local smoke scripts share one local DB. Reward-tier smoke must clean up created tiers, claims, and audit rows or later admin smoke runs will turn flaky.
- A user can hold multiple active club memberships and multiple active events. The route cannot silently assume one event context or it risks editing the wrong reward catalog.
- CI and smoke posture is still thin at repo level, so this slice should leave explicit app-local management smoke coverage, not just route rendering.
- Documentation should stay deployment-aware: local app run, route scope, required function dependency, and next GTM/admin rollout steps must remain obvious.

## Dependencies

- Existing `reward_tiers`, `reward_claims`, `events`, `club_members`, and `audit_logs`.
- Existing `claim_reward_atomic` inventory semantics and seeded organizer, club, event, student, and reward-tier rows from `supabase/seed.sql`.
- Existing mobile reward and event detail read models that already depend on `reward_tiers.status`, `required_stamp_count`, `inventory_total`, `inventory_claimed`, `reward_type`, and `claim_instructions`.
- Existing seeded `PLATFORM_ADMIN`, `CLUB_ORGANIZER`, and `STUDENT` accounts for auth-backed smoke.
- Current `apps/admin` SSR auth foundation and role-gated `/admin` route.
- Official Next.js App Router guidance already adopted in this app, plus current Supabase query, RPC, and RLS behavior.

## Existing Logic Checked

- Reward tiers already exist in DB and student mobile reads, but there is no club web management surface yet.
- `DashboardShell`, club route guards, and club event read context already exist, so the new organizer route should extend the same club surface instead of creating a parallel layout.
- Existing app-local smoke scripts cover auth, route gating, admin moderation, oversight visibility, and club event creation; they do not yet cover reward-tier writes or claimed-stock edge cases.
- The previous event slice already introduced organizer-only event editing helper logic; reward-tier policy tightening should follow the same ownership boundary.

## Review Outcome

This slice now ships as:

- organizer-only DB write paths: `create_reward_tier_atomic` and `update_reward_tier_atomic`
- tighter direct-write RLS on `reward_tiers` so `CLUB_STAFF` cannot bypass the route
- new `/club/rewards` organizer surface with event-scoped reward creation, stock visibility, and inline editing
- stronger app-local smoke coverage for organizer-only writes, claimed-stock boundaries, and repeatable fixture cleanup
- documented local dependency on `supabase functions serve --env-file supabase/.env.local` for route-backed admin smokes that hit Edge Functions
