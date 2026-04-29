# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Add a real light mode beside the existing dark mode, introduce Finnish-first bilingual mobile copy (Finnish + English), and add a proper description section to event detail while checking every current mobile route for leftover hardcoded theme/copy issues.

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

- The current mobile theme is module-static; if theme tokens stay embedded in `StyleSheet.create(...)` at import time, light mode will look partially broken.
- A literal machine translation tone will make Finnish copy feel fake even if technically correct.
- Date/time, tab labels, access cards, auth buttons, reward states, and leaderboard/status surfaces all carry visible user copy; missing just a few will make the bilingual pass feel inconsistent.
- If event detail keeps only a short hero summary, long organizer descriptions still remain buried.
- Preference persistence must not race with session/bootstrap and create flicker between dark/light or English/Finnish on launch.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Existing mobile typography and cover-image redesign
- `expo-secure-store` for persisted UI preferences
- Existing student/business route tree in Expo Router
- Existing event/reward/leaderboard/profile data flows so the theme/i18n pass stays presentation-focused

## Existing Logic Checked

- Mobile currently has no app-level i18n system; nearly all visible copy is hardcoded in English inside route components and shared cards.
- Mobile currently has only one exported `mobileTheme`; route and component styles bake dark tokens directly into static styles.
- `app/_layout.tsx` already reads the device color scheme for React Navigation, but the actual app UI ignores it.
- Event detail already receives `description`, but it is only used as a short hero summary instead of a real long-form section.
- Session, reward, leaderboard, QR, and business flows already exist and should not need logic rewrites for this slice.

## Review Outcome

Do a focused mobile platform pass:

- add a persisted UI preference layer for theme mode and language
- convert the shared mobile foundation and all current mobile routes to theme-aware styling
- add Finnish-first bilingual copy across student, business, auth, and shared mobile surfaces
- keep English as a clean fallback, not a separate visual mode
- promote event detail description into its own readable section under the hero
- re-run mobile validation after the refactor and update the handoff honestly
