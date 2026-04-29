# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Continue the cleaned STARK mobile theme by reducing border noise, adding action icons where they help, narrowing the palette around lime-on-dark, and simplifying auth and sign-out presentation without breaking the validated flows.

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
- `apps/mobile/src/app/auth/callback.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/auth/components/login-hero.tsx`
- `apps/mobile/src/features/auth/components/google-sign-in-button.tsx`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/src/features/auth/components/sign-out-button.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/components/app-icon.tsx`

## Risks

- The diagnostic cleanup made the product boundary better, but the UI still leans too hard on bordered boxes and secondary containers.
- If we keep cyan, pink, lime, and amber equally loud, the app still feels scattered. The user wants one dominant accent, not four competing ones.
- Auth and sign-out are small surfaces, but they set the tone fast; if they still feel tool-like, the whole product feels less polished.
- Foundation-level border changes affect many routes at once, so we need to validate web export after any token adjustment.

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

- The user-facing diagnostics are now gone from the main mobile flows.
- The remaining design complaint is mostly about chrome: too many borders, too many boxed groups, too many equally loud accents.
- Shared auth buttons, sign-out, and card primitives are the highest leverage places to simplify the visual language.
- The current hosted admin issue is already understood as Vercel protection, so this pass can stay focused on mobile polish.

## Review Outcome

Keep the STARK direction, but make it calmer:

- use lime + dark neutrals as the dominant pairing
- reduce borders and let spacing/shadow carry more structure
- add icons only to obvious actions and selectors
- simplify auth, rewards, and sign-out surfaces until they feel like product UI instead of tooling
