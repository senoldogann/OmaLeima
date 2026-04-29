# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Audit the redesign branch after the light-mode/i18n wave, fix the remaining business-side dark-only / English-only regressions, and close the last shared mobile helpers that still depended on module-static dark tokens.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/_layout.tsx`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/auth/login.tsx`
- `apps/mobile/src/app/auth/callback.tsx`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/src/features/auth/components/google-sign-in-button.tsx`
- `apps/mobile/src/features/auth/components/login-hero.tsx`
- `apps/mobile/src/features/auth/components/auth-loading-panel.tsx`
- `apps/mobile/src/features/auth/components/access-issue-card.tsx`
- `apps/mobile/src/features/auth/components/sign-out-button.tsx`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/components/cover-image-surface.tsx`
- `apps/mobile/src/components/info-card.tsx`
- `apps/mobile/src/components/status-badge.tsx`
- `apps/mobile/src/features/events/event-visuals.ts`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/features/leaderboard/components/leaderboard-entry-card.tsx`
- `apps/mobile/src/features/profile/components/profile-tag-card.tsx`
- `apps/mobile/src/features/notifications/student-reward-celebration.tsx`
- `apps/mobile/src/features/notifications/student-reward-notification-model.ts`
- `apps/mobile/src/features/notifications/student-reward-notifications.ts`
- `apps/mobile/src/features/foundation/theme.ts`
- `apps/mobile/src/features/foundation/components/glass-panel.tsx`
- `apps/mobile/src/features/foundation/components/glass-tab-bar-background.tsx`
- `apps/mobile/src/features/foundation/components/auto-advancing-rail.tsx`
- `apps/mobile/src/features/foundation/components/foundation-status-card.tsx`
- `apps/mobile/src/features/preferences/ui-preferences-provider.tsx`
- `apps/mobile/src/features/i18n/translations.ts`
- `apps/mobile/src/providers/app-providers.tsx`

## Risks

- Business routes were still importing `mobileTheme` directly, so student/auth looked correct in light mode while operator screens stayed dark-only.
- Business operator copy was still English-heavy, which broke the Finnish-first promise and made the translation pass feel incomplete.
- Shared helpers like `student-reward-celebration`, `foundation-status-card`, and `auto-advancing-rail` still baked dark tokens at module load time, so a theme toggle could leave those surfaces visually inconsistent.
- The hosted Vercel login error the user saw may be a stale deployment rather than a live code bug; the review must separate buildable code issues from deploy freshness.

## Dependencies

- Existing light/dark + `fi/en` mobile infrastructure already added on this branch
- Existing student-side theme/copy migration, which should remain untouched except for shared helper compatibility
- Existing business query/mutation/RPC flows, which must stay behavior-identical while presentation and copy are fixed
- Existing admin login code path, which builds locally and should not regress while the mobile review slice lands

## Existing Logic Checked

- Student/auth routes already consume runtime theme + bilingual copy correctly and validate cleanly.
- The remaining obvious drift lived in:
  - `apps/mobile/src/app/business/home.tsx`
  - `apps/mobile/src/app/business/events.tsx`
  - `apps/mobile/src/app/business/history.tsx`
  - `apps/mobile/src/app/business/scanner.tsx`
  - `apps/mobile/src/features/notifications/student-reward-celebration.tsx`
  - `apps/mobile/src/features/foundation/components/foundation-status-card.tsx`
  - `apps/mobile/src/features/foundation/components/auto-advancing-rail.tsx`
- The hosted admin login route already builds locally; the blank hosted page likely needs a fresh deploy to reflect the code path fix.

## Review Outcome

Do a focused hardening pass:

- migrate the remaining business mobile routes to runtime theme-aware styles
- add Finnish-first business operator copy while keeping English fallback clean
- convert the last shared mobile helpers off module-static `mobileTheme`
- rerun mobile + admin validation
- update the handoff honestly with what is code-closed vs. still deployment- or launch-related
