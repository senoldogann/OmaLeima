# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-glass-design-foundation`
- **Goal:** Create a shared mobile visual foundation that gives the student app an Apple-like glass feel on iOS, a strong Android/web fallback, and playful but controlled motion.

## Architectural Decisions

- Put the main styling logic into shared mobile primitives instead of hand-tuning each screen separately.
- Use native `expo-glass-effect` where runtime support exists, but always wrap it in a fallback surface so Android and web stay intentional.
- Follow Apple guidance: keep the strongest glass treatment for navigation, controls, and highlighted chrome; keep content cards translucent but calmer.
- Use lightweight mount and emphasis motion that works in Expo web export without depending on device-only interactions.
- Improve the student tabs visually in the same slice so the app shell matches the new card language.

## Alternatives Considered

- Restyling every mobile screen one by one:
  - rejected because it would create duplicated styling logic and raise the chance of inconsistent results
- Using iOS-only glass everywhere with no fallback:
  - rejected because Android and web would feel unfinished
- Adding a large new animation or gradient dependency first:
  - rejected because the current app already has enough primitives to ship a good foundation without widening scope

## Edge Cases

- iOS glass APIs can be unavailable at runtime or limited by accessibility settings; fallback surfaces must still look deliberate.
- Dense surfaces like QR, reward progress, and status summaries must remain readable with stronger translucency and accent lighting.
- Tab bar and screen padding changes must not clip content or create overlap on small phones.
- Motion should feel alive without blocking state transitions, retry buttons, or query-driven loading/error states.

## Validation Plan

- Build shared foundation primitives first, then restyle login and the core student screens on top of them.
- Re-run `apps/mobile` lint, typecheck, and `export:web`.
- Smoke the updated surfaces in the local web preview after export-friendly validation passes.
- Update handoff docs so later agents know domain cutover remains parked and the next frontend work should extend the same glass/motion language instead of inventing a second style.
