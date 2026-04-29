# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Review the new STARK theme wave started by another agent, make sure it does not break the product, fix the real compile/runtime issues it introduced, and carry the same theme language into the remaining mobile surfaces that still look half-updated.

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
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/app/auth/login.tsx`
- `apps/mobile/src/features/auth/components/login-hero.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`

## Risks

- The new STARK wave already introduced a real compile break in `business/home.tsx`; we need to treat this as a live integration pass, not just visual polish.
- Several screens now mix the new opaque STARK tokens with older blue/glass accents, which can make the app feel inconsistent even when each file looks fine alone.
- The QR and scanner flows are already physically validated, so theme continuation must not weaken readability, countdown clarity, or scan-result urgency.
- The agent changed admin global CSS heavily; mobile continuation should stay focused and not casually reopen web logic or routing.

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

- Another agent already started a new STARK theme direction: darker opaque surfaces, lime/cyan/pink accents, less glass and fewer soft halos.
- That direction is materially different from the earlier liquid-glass pass, but the user explicitly asked us to continue this new theme logic and color language rather than revert it.
- The branch currently fails mobile lint/typecheck because `business/home.tsx` imports the wrong Supabase module and references a non-existent `joinedEvents` field.
- `student/events/index.tsx`, `student/leaderboard.tsx`, `business/history.tsx`, `auth/login.tsx`, and `login-hero.tsx` still show clear pre-STARK visual leftovers.
- `reward-progress-card.tsx`, `student/rewards.tsx`, `student/active-event.tsx`, and `business/scanner.tsx` are already partially migrated and should become the reference for the rest of this pass.

## Review Outcome

Continue the redesign in the new STARK direction, but do it as a hardening pass:

- fix the real compile and lint regressions first
- normalize the remaining mobile surfaces to the same theme language
- preserve validated product behavior while changing presentation only
- keep admin work out of scope unless a clear shared-token issue forces it
