# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-rewards-progress`
- **Scope:** Phase 3 student reward progress and claimable tier visibility across QR and rewards surfaces.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/features/events/*`
- `apps/mobile/src/features/rewards/*`
- `apps/mobile/src/features/qr/*`
- `apps/mobile/src/components/*`

## Risks

- Reward progress must reflect real stamp counts and real `reward_claims`, not optimistic client assumptions.
- Claimable status should not imply that the student can self-claim from mobile; physical handoff still belongs to club staff.
- The QR screen already has a simple progress block, so this branch should unify surfaces instead of drifting into duplicate reward logic.
- Reward visibility should respect existing RLS: own claims only, public active tiers only, own registrations only.
- Seed data contains only one reward tier on one event, so multi-tier and claimed-state validation needs local fixture rows.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for student reward UX, reward progress, and claim eligibility visibility.
- Existing `apps/mobile` auth foundation and route guard merged in Phase 3.
- Current reward tier, reward claim, stamp, and registration RLS behavior in Supabase.

## Existing Logic Checked

- `apps/mobile` already has session bootstrap, route protection, and sign-out, so the events screen can assume authenticated access.
- Student event detail already reads reward tiers but only as static metadata.
- The QR screen now shows stamp progress for one active event, but it does not yet explain claimable versus claimed reward states.
- `claim_reward_atomic` and `claim-reward` already exist and have local smoke coverage, so the student app only needs read-only progress and eligibility visibility in this slice.
- `reward_claims` RLS already allows students to read only their own claims, which is enough to derive claimed-state badges on mobile.

## Review Outcome

Implement a shared reward-progress read surface in `apps/mobile`: derive stamp progress, claimable state, more-needed counts, claimed state, and stock visibility from Supabase reads, then reuse that surface on both the rewards tab and the active QR screen.
