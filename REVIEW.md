# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Continue the full UI redesign with a second mobile wave that carries the new visual language into the remaining high-traffic student and business surfaces without changing the validated product flows.

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
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`
- `apps/mobile/src/features/profile/components/profile-tag-card.tsx`

## Risks

- A visual redesign can accidentally weaken readability in dark, crowded event conditions if we over-index on glass and glow.
- Shared foundation changes affect many screens at once, so spacing, contrast, and status semantics must remain consistent.
- The QR screen is already physically validated; redesign work must not break its refresh cadence, token visibility, or scanner helper copy.
- Profile, rewards, and business surfaces still mix older tokens with the newer glass system, so partial updates can make the app feel less coherent before it feels better.
- The business scanner is already part of a physically validated hosted flow. Visual changes must not weaken scan clarity, active event selection, or result legibility during dark event conditions.
- The event detail screen is information-dense and easy to over-style. If hierarchy gets too decorative, join state, reward state, and schedule details become harder to scan.

## Dependencies

- Existing mobile glass foundation from the previous UI pass
- Expo Glass Effect fallback behavior across iOS, Android, and web
- Current student flows that already passed physical-device and hosted smoke validation
- User inspiration file: `/Users/dogan/Desktop/platform_design_prompts.md`

## Existing Logic Checked

- `mobileTheme`, `GlassPanel`, `AppScreen`, `InfoCard`, and `StatusBadge` already provide a good structural base, but they still read as conservative and system-like rather than distinctly OmaLeima.
- The student QR and event list now speak the new visual language, but event detail, rewards, and profile still feel split between the redesign and the older slate-card pass.
- Business home, events, and scanner still rely heavily on hardcoded dark-blue cards and generic action buttons, so the operator side does not yet feel like the same product family as the student side.
- Reward progress currently has no richer "earned leima" stamp strip or venue-memory cue, but the current data shape does not yet expose venue logos or per-stamp visuals. The first redesign slice should therefore improve the surface language now and leave deeper data-backed celebratory details for a later pass if needed.
- The user wants the redesign to reflect students, parties, and simplicity without becoming noisy or generic. The shared visual system needs stronger rhythm, richer highlights, and more character while keeping one-thumb usability and scan readability intact.

## Review Outcome

Ship the redesign as a controlled second wave that:

- reuses the shared foundation instead of creating a second competing component style
- brings event detail, rewards, and profile into the same richer student language
- upgrades business home, events, and scanner so staff routes also feel deliberate and premium
- keeps all validated auth, QR, scanner, and push behavior unchanged while the product feel becomes more expressive
