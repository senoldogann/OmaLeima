# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Re-check every mobile role surface and remove unnecessary chrome. Keep only the cards and text blocks that help students or staff make a decision, while preserving the current STARK visual direction.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/foundation/theme.ts`
- `apps/mobile/src/features/foundation/components/glass-panel.tsx`
- `apps/mobile/src/features/foundation/components/glass-tab-bar-background.tsx`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/components/info-card.tsx`
- `apps/mobile/src/components/status-badge.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
 - `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/app/student/profile.tsx`

## Risks

- Too many stacked cards make simple flows feel heavier than they are, especially on profile, leaderboard, event detail, business events, and scanner.
- Some role pages still explain too much instead of showing one clear action and one clear state.
- Removing too much structure can hide important event-day context, so scanner and QR surfaces still need strong hierarchy without extra boxes.
- This pass touches multiple signed-in routes, so static validation must still run after the simplification.

## Dependencies

- Existing redesign branch state in `feature/full-ui-redesign-foundation`
- The newly introduced STARK design tokens and opaque surface direction
- Local Stitch exports and prompt file for reference:
  - `/Users/dogan/Desktop/stitch_omaleima_liquid_glass_pass`
  - `/Users/dogan/Desktop/stitch_omaleima_liquid_admin_panel`
  - `/Users/dogan/Desktop/stitch_omaleima_android_m3_expressive`
  - `/Users/dogan/Desktop/platform_design_prompts.md`
- Previously validated auth, QR, scanner, stamp, reward, and push flows that must stay intact

## Existing Logic Checked

- The main diagnostics surfaces are already removed from end-user flows.
- The remaining issue is page density, not missing functionality.
- The highest-noise routes are `student/profile`, `student/leaderboard`, `student/events/[eventId]`, `business/events`, and `business/scanner`.
- Rewards and active-event are closer to the target, but rewards summary and profile/tag surfaces can still be lighter and more elegant.

## Review Outcome

Keep the current STARK direction, but simplify each role page:

- merge or remove redundant top-level cards
- move short helper text inline instead of giving it a full container
- keep one dominant action per section
- let spacing do more work than borders
- keep rewards/account/tag surfaces readable without making them look like admin tooling
