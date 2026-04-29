# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Start the full UI redesign with a shared mobile foundation and a first pass on the key student surfaces.

## Architectural Decisions

- Redesign the visual foundation first instead of editing every screen independently.
- Keep one shared cross-platform theme file, but make the surface language more expressive so iOS glass and Android fallback still feel like the same product family.
- Strengthen reusable primitives (`AppScreen`, `GlassPanel`, `InfoCard`, `StatusBadge`, `FoundationStatusCard`) before restyling feature screens.
- Start with student-facing hero surfaces because they carry the strongest product identity and already have proven behavior.
- Do not change queries, mutations, auth flow, or QR refresh logic in this slice unless a visual change forces a safe markup adjustment.

## Alternatives Considered

- Jumping directly into a full-screen-by-screen rewrite:
  - rejected because it would create a wide diff without a stable shared language underneath
- Starting with admin and club web redesign at the same time:
  - rejected because mobile student surfaces are both the most visible and the clearest place to prove the new direction first
- Adding new backend fields for venue-logo-based stamp memories in the same slice:
  - rejected because the user asked for the big redesign phase to begin now, and the first slice should improve the visual system without reopening validated data flows

## Edge Cases

- Large glass surfaces can easily reduce text contrast against busy ambient backgrounds; every upgraded surface must preserve readable copy and status states.
- QR and reward screens must still work cleanly when no event is registered, the event is upcoming, or reward progress is unavailable.
- Android and web fallback surfaces should feel intentional rather than like a downgraded iOS copy.
- Old screens that still use hardcoded slate colors must be fully moved onto theme tokens in the touched areas, or the redesign will look half-finished.

## Validation Plan

- Update the working docs for the redesign branch.
- Refresh the shared mobile theme and foundation components.
- Restyle the student events, QR, rewards, and profile-tag surfaces around that new foundation.
- Use static repo validation in this slice (`lint`, `typecheck`, `export:web`) and keep a dedicated logged-in runtime visual smoke as the next proof step.
- Run `npm --prefix apps/mobile run lint`.
- Run `npm --prefix apps/mobile run typecheck`.
- Run `npm --prefix apps/mobile run export:web`.
- Update `PROGRESS.md` with the redesign slice and the next recommended visual wave.
