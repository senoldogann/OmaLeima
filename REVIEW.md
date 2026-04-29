# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Start the full UI redesign with a foundation-first mobile slice that establishes a stronger shared visual language, then applies it to the most visible student surfaces without changing the validated product flows.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/foundation/theme.ts`
- `apps/mobile/src/features/foundation/components/glass-panel.tsx`
- `apps/mobile/src/features/foundation/components/foundation-status-card.tsx`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/components/info-card.tsx`
- `apps/mobile/src/components/status-badge.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/features/profile/components/profile-tag-card.tsx`

## Risks

- A visual redesign can accidentally weaken readability in dark, crowded event conditions if we over-index on glass and glow.
- Shared foundation changes affect many screens at once, so spacing, contrast, and status semantics must remain consistent.
- The QR screen is already physically validated; redesign work must not break its refresh cadence, token visibility, or scanner helper copy.
- Profile and rewards surfaces still mix older tokens with the newer glass system, so partial updates can make the app feel less coherent before it feels better.

## Dependencies

- Existing mobile glass foundation from the previous UI pass
- Expo Glass Effect fallback behavior across iOS, Android, and web
- Current student flows that already passed physical-device and hosted smoke validation
- User inspiration file: `/Users/dogan/Desktop/platform_design_prompts.md`

## Existing Logic Checked

- `mobileTheme`, `GlassPanel`, `AppScreen`, `InfoCard`, and `StatusBadge` already provide a good structural base, but they still read as conservative and system-like rather than distinctly OmaLeima.
- The student QR, events, rewards, and profile surfaces are functionally sound, yet visually inconsistent: some screens use the new glass language while others still use older slate cards and generic copy blocks.
- Reward progress currently has no richer "earned leima" stamp strip or venue-memory cue, but the current data shape does not yet expose venue logos or per-stamp visuals. The first redesign slice should therefore improve the surface language now and leave deeper data-backed celebratory details for a later pass if needed.
- The user wants the redesign to reflect students, parties, and simplicity without becoming noisy or generic. The shared visual system needs stronger rhythm, richer highlights, and more character while keeping one-thumb usability and scan readability intact.

## Review Outcome

Ship the redesign as a controlled foundation slice that:

- strengthens the shared color, spacing, and surface language first
- upgrades reusable cards, badges, and background composition before touching every screen
- applies the new language to the most visible student flows: event discovery, QR hero, reward progress, and profile tags
- keeps all validated QR, scanner, and push behavior unchanged while the product feel becomes more expressive
