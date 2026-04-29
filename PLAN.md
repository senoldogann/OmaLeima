# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/mobile-diagnostics-cleanup`
- **Goal:** Remove the last misleading mobile diagnostics states by identifying the current dev-client runtime correctly and making the push diagnostics refresh visibly react on the student profile route.

## Architectural Decisions

- Keep the fix in JavaScript and inside the existing diagnostics path so the already-installed development build can pick it up from Metro without another iOS build.
- Tighten runtime classification in `readPushRuntimeMode()` using Expo runtime evidence we already have locally: physical-device state, Metro-hosted config, and the EAS project id.
- Add visible refresh state in the profile route instead of silently refreshing in the background.
- Extend the current native push readiness audit rather than creating a second overlapping diagnostics audit.

## Alternatives Considered

- Leaving the runtime label as `bare`:
  - rejected because the user already proved a real Expo dev client on a physical iPhone, so the diagnostics would stay misleading
- Adding a brand new diagnostics provider field for every tap:
  - rejected because the profile screen can own the short-lived UI feedback locally
- Ignoring the refresh button complaint and only changing docs:
  - rejected because the current UX makes a working button feel broken

## Edge Cases

- Expo Go must still stay a warning state even if it is on a physical device.
- Web preview must stay `pending` and never be promoted to a native-ready runtime.
- A manual refresh should not erase the captured notification rows.
- The audit should fail if the runtime copy or refresh feedback drifts out of sync with the shipped UI.

## Validation Plan

- Run mobile `lint`, `typecheck`, and `export:web`.
- Run the existing native push device readiness audit after updating it for the new runtime and refresh signals.
- Update `apps/mobile/README.md`, `docs/TESTING.md`, and the handoff docs with the diagnostics cleanup result.
