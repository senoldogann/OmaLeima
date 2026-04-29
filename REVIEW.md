# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Add stronger visual hierarchy to rewards and event discovery, turn profile tags into a modal flow with a cleaner account hero, and verify the current stamp-rule logic before any behavioral change is made.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/rewards/types.ts`
- `apps/mobile/src/features/rewards/student-rewards.ts`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/components/app-icon.tsx`
- `supabase/migrations/20260427180000_initial_schema.sql`
- `supabase/migrations/20260429113000_scan_stamp_atomic_reward_unlocks.sql`

## Risks

- Rewards cards now need event imagery, so the rewards query has to carry cover-image data without disturbing the existing progress logic.
- A profile tags modal should reduce clutter, but it must not hide the create / remove / primary actions behind broken state transitions.
- Event discovery imagery has to stay aligned with the existing black/lime palette and not turn into a second theme direction.
- The product-rule question is not purely visual: if the desired stamp policy differs from the schema, we should explain the gap clearly before changing behavior.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing event cover fallback helper in `apps/mobile/src/features/events/event-visuals.ts`
- Student rewards query and shared `StudentRewardEventProgress` type
- Current stamp uniqueness constraints and `scan_stamp_atomic` RPC behavior in Supabase

## Existing Logic Checked

- Rewards cards already have enough condensed progress content to support a hero image treatment once `coverImageUrl` is carried into the reward event type.
- Profile currently exposes all tag controls inline, which creates clutter but does not need new backend logic to become a modal.
- The current schema uses `unique (event_id, student_id, business_id)` for `stamps`, which means one valid stamp per student per business per event.
- `event_venues` uses `unique (event_id, business_id)`, so the same venue/business cannot currently appear twice inside one event route.

## Review Outcome

Do a focused discovery / rewards / profile pass:

- carry event covers into rewards and give the horizontal rail a clearer swipe affordance
- add an image-backed discovery hero so the page feels tied to the product domain
- simplify profile by moving tag management into a bottom-sheet style modal and adding an avatar-centered identity block
- keep current stamp logic unchanged, but document the real current rule clearly in the handoff
- re-run mobile validation and then reassess whether the stamp policy itself should become configurable in a later slice
