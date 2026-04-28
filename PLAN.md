# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/native-push-device-smoke-readiness`
- **Goal:** Ship the smallest honest native push device-smoke readiness slice for mobile: Expo dev-client alignment, provider-owned notification diagnostics, and a focused QA audit for the next physical-device verification step.

## Architectural Decisions

- Add `expo-dev-client` and import it at the app root so the future development-build/device smoke path matches Expo’s current recommendation.
- Keep push runtime and last-notification diagnostics in a dedicated provider-level module so listeners are created once and survive screen changes.
- Reuse the current profile route for the manual smoke surface instead of inventing a new diagnostics screen.
- Keep the new QA path read-only: a repository audit should prove the readiness wiring exists without pretending to replace real device testing.

## Alternatives Considered

- Building the actual iOS and Android development binaries in this slice:
  - rejected because the user asked for the next best step, and the repo still lacks a first-class in-app diagnostics surface for manual verification
- Adding a separate hidden debug route for push diagnostics:
  - rejected because the profile route already owns token registration and is the least surprising place for this information
- Expanding the diagnostics surface into a full notification inbox:
  - rejected because it would sprawl into UI/product work that the user explicitly wants to defer

## Edge Cases

- Expo Go can still request permissions, but remote push smoke should show it as a warning path rather than a green path.
- Web export must keep working even after adding `expo-dev-client` and notification diagnostics imports.
- Some runtimes may expose a last notification response before the app registers listeners on boot, so the provider should bootstrap that state explicitly.
- Permission status can change outside the app, so diagnostics should refresh on app foreground instead of only on first mount.

## Validation Plan

- Install the new Expo dependency through the project package manager so `package-lock.json` stays aligned.
- Run `apps/mobile` lint, typecheck, export, and the new native-push readiness audit.
- Run the root wrapper for the new mobile readiness slice from the repo root.
- Get a reviewer pass because the most likely mistakes here are duplicate listeners, false-green diagnostics, and web/export regressions.
