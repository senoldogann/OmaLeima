# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-reward-distribution`
- **Scope:** Phase 5 club-side reward handoff confirmation screen.

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
- `docs/*`

## Risks

- Reward handoff is a stock-changing write path. Confirmation must not bypass the existing duplicate protection or inventory floor logic already enforced in `claim_reward_atomic`.
- Club claim UI must not leak extra student metadata. Club staff can read event registrations, stamps, and reward claims, but `profiles` RLS does not grant broad student profile reads.
- The route boundary is different from reward-tier management. `CLUB_STAFF` should be allowed to confirm reward claims even though they cannot manage reward catalog configuration.
- Claim candidate lists can grow quickly on event day. The read model must use bounded queries and avoid per-student query loops.
- Shared app-local smoke scripts run against one local DB. This new claim smoke must clean up seeded stamps, claims, rewards, and temp staff fixtures or later runs will become flaky.
- Repo-level CI is still thin, so this slice needs strong app-local smoke coverage for success, duplicate claim, low-stamp rejection, stock rejection, RLS boundaries, and staff-vs-student access behavior.

## Dependencies

- Existing `claim_reward_atomic` RPC and `claim-reward` Edge Function behavior.
- Existing tables and RLS on `events`, `event_registrations`, `stamps`, `reward_tiers`, `reward_claims`, `club_members`, and `audit_logs`.
- Existing club SSR auth foundation and club route shell in `apps/admin`.
- Existing `/club/rewards` and `/club/events` patterns for server read models, route-backed writes, and app-local smoke structure.
- Existing seeded organizer, student, scanner, and club data from `supabase/seed.sql`.

## Existing Logic Checked

- `claim_reward_atomic` already enforces duplicate protection, valid stamp threshold, out-of-stock rejection, and atomic inventory increment.
- `reward_claims` already has unique `(event_id, student_id, reward_tier_id)` protection and event-scoped club-staff read access.
- `fetchClubEventContextAsync` already distinguishes club memberships and `canCreateEvents`, which matters because claim confirmation should allow broader club access than reward-tier editing.
- Mobile student rewards already compute claimability states, but admin club web does not yet expose a reward delivery workflow.
- Current admin app smokes already prove route access, reward-tier inventory edits, and cleanup patterns we can reuse for this slice.

## Review Outcome

Add a dedicated club reward-claims workflow that lets club staff or organizers:

- open a bounded event-scoped claim console
- see masked student claim candidates and recent claim history
- confirm physical reward handoff through a route-backed call into `claim_reward_atomic`
- keep student privacy intact
- leave repeatable smoke coverage for event-day claim operations
