# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Continue the full UI redesign by capturing real runtime proof for the redesigned mobile surfaces, starting with the business routes that already have a reliable local sign-in path.

## Architectural Decisions

- Redesign the visual foundation first instead of editing every screen independently.
- Keep one shared cross-platform theme file, but make the surface language more expressive so iOS glass and Android fallback still feel like the same product family.
- Strengthen reusable primitives (`AppScreen`, `GlassPanel`, `InfoCard`, `StatusBadge`, `FoundationStatusCard`) before restyling feature screens.
- Start with student-facing hero surfaces because they carry the strongest product identity and already have proven behavior.
- Use the same student foundation to pull business routes into one family instead of inventing a separate operator-only style.
- Do not change queries, mutations, auth flow, or QR refresh logic in this slice unless a visual change forces a safe markup adjustment.
- Use business email/password auth as the runtime-proof path because it is deterministic on local web and does not depend on Expo Go or Google redirect edge cases.

## Alternatives Considered

- Jumping directly into a full-screen-by-screen rewrite:
  - rejected because it would create a wide diff without a stable shared language underneath
- Starting with admin and club web redesign at the same time:
  - rejected because mobile student surfaces are both the most visible and the clearest place to prove the new direction first
- Adding new backend fields for venue-logo-based stamp memories in the same slice:
  - rejected because the user asked for the big redesign phase to begin now, and the first slice should improve the visual system without reopening validated data flows
- Jumping directly into admin web redesign in the same branch:
  - rejected because mobile still has the clearest identity gap, and business mobile benefits from the same foundation work immediately
- Marking the redesign “done” from static export alone:
  - rejected because the user explicitly wants the project to stay rigorous, and signed-in runtime proof is the missing piece for the current wave

## Edge Cases

- Large glass surfaces can easily reduce text contrast against busy ambient backgrounds; every upgraded surface must preserve readable copy and status states.
- QR and reward screens must still work cleanly when no event is registered, the event is upcoming, or reward progress is unavailable.
- Android and web fallback surfaces should feel intentional rather than like a downgraded iOS copy.
- Old screens that still use hardcoded slate colors must be fully moved onto theme tokens in the touched areas, or the redesign will look half-finished.
- Scanner result states still need high urgency contrast even after the palette becomes more expressive.
- Student profile diagnostics and push sections are operationally dense, so the redesign must improve grouping without hiding important debugging signals.
- Local runtime smoke may prove business routes while student Google-linked routes remain unproven on web. If that happens, the remaining gap must stay documented rather than hidden.

## Validation Plan

- Update the working docs for the runtime-proof slice.
- Start local mobile web preview.
- Sign in through the business email/password route on local web.
- Capture runtime proof for redesigned business home, events, and scanner surfaces.
- Fix any runtime-only UI regressions that the smoke reveals.
- Keep student runtime proof status explicit if it still depends on Google-linked flows.
- Run `npm --prefix apps/mobile run lint`.
- Run `npm --prefix apps/mobile run typecheck`.
- Run `npm --prefix apps/mobile run export:web`.
- Update `PROGRESS.md` with the runtime-proof slice and the next recommended visual wave.
