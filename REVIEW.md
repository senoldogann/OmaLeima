# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-01
- **Branch:** `feature/push-diagnostics-polish`
- **Scope:** Remove the confusing dev-only push diagnostics exposure from the normal student settings flow, improve its presentation for QA users, and fix light-mode primary action contrast across the mobile app.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/components/app-icon.tsx`
- `apps/mobile/src/features/foundation/theme.ts`
- `apps/mobile/src/features/i18n/translations.ts`
- primary-action mobile surfaces that currently render lime buttons

## Risks

- `Push diagnostics` is a QA-only tool, but it currently reads like a user-facing feature inside profile preferences.
- Light-mode lime actions currently reuse a dark-theme text token, so button contrast is weak in exactly the screens users tap most.
- This pass touches shared theme tokens, so a sloppy change can ripple through many mobile routes.

## Dependencies

- Existing `UiPreferencesProvider` still owns language/theme state and should keep driving both student and business settings.
- The dev-only push diagnostics modal should stay available for QA, but it should be visually demoted and clearly separated from user settings.
- Existing mobile/admin validation commands remain the minimum merge gate.

## Existing Logic Checked

- The latest `main` already contains the support migration, shared support mobile layer, and business profile route.
- The working tree is clean apart from the known untracked `.idea/` folder that must stay untouched.
- The current student profile shows a dev-only `Push diagnostics` button directly under notifications, which is technically gated by `__DEV__` but still visually noisy.
- Multiple primary-action buttons still use `theme.colors.screenBase` for labels/icons, which washes out on the light-mode lime background.

## Review Outcome

Do a focused polish pass:

- refresh the working docs so branch and scope are truthful
- move `Push diagnostics` into a cleaner dev-only QA settings row
- fix primary-action foreground contrast in light mode with a shared theme token
- keep the change minimal and product-facing
- rerun the relevant mobile validation gates
- record the outcome before merging back to `main`
