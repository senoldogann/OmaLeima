# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-unlock-notification-followup`
- **Goal:** Ship the smallest student reward notification behavior that works with the current Realtime foundation and does not overclaim remote push support yet.

## Architectural Decisions

- Build the behavior inside a dedicated mobile notifications feature module instead of scattering ad hoc effects across multiple student screens.
- Use the existing student reward overview as the single source of truth for unlock and stock-change detection.
- Keep the notification bridge app-level so student reward notifications can fire outside the rewards tab.
- Present local device notifications only when the app already has notification permission; do not auto-prompt again from this slice.
- Seed first-load state without backfilling old unlocks so the bridge does not spam already claimable rewards on initial hydration.

## Alternatives Considered

- Adding backend `REWARD_UNLOCKED` push delivery now:
  - rejected because it widens the slice into new Edge Function behavior, notification rows, and device-level delivery testing
- Adding a full mobile notification center route now:
  - rejected because the user already asked to defer the broader UI pass
- Detecting unlocks separately on each reward screen:
  - rejected because duplicate mounted screens would make de-duplication and future maintenance worse

## Edge Cases

- Web preview must not fail just because local device notifications are unavailable there.
- Simulator and Expo Go behavior differ from physical-device remote push behavior, so this slice should stay honest about being local notification behavior first.
- Reward overview can refetch with unchanged data; notifications must only fire on real transition boundaries.
- A reward can become unavailable because another student claimed the last inventory slot, so stock-change detection must use the same shared inventory state the UI already shows.

## Validation Plan

- Run `apps/mobile` lint, typecheck, and `export:web`.
- Add or update a small repo-owned audit for the reward notification bridge if the code introduces behavior that could otherwise be overclaimed in docs.
- Get a reviewer pass because duplicate notification and hidden spam regressions are easy to miss.
