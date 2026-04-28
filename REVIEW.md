# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/native-simulator-smoke-pass`
- **Scope:** Do everything still possible without a physical device: simulator and emulator readiness, development-build launch guidance, and repo-owned QA/docs that shrink the final manual push step to the smallest honest checklist.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `package.json`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/lib/push.ts`
- `apps/mobile/scripts/audit-native-simulator-smoke.mjs`
- `tests/run-mobile-native-simulator-smoke.mjs`
- `apps/mobile/README.md`
- `LEIMA_APP_MASTER_PLAN.md`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`

## Risks

- iOS Simulator and Android Emulator can validate launch flow, auth flow, and diagnostics wiring, but not honest remote push delivery. The new slice must keep that boundary explicit.
- Any simulator/emulator-facing guidance should stay aligned with the current Expo SDK 55 development-build path instead of drifting back toward Expo Go.
- This slice must not introduce fake automation claims if the local machine lacks a booted simulator or emulator.
- The user wants us to handle as much as possible first, so the remaining manual step must be short, concrete, and production-minded.

## Dependencies

- Existing native push diagnostics surface and readiness audit from the previous slice.
- Expo development-build guidance and push-notification setup guidance from official docs.
- Available Expo, iOS, and Android plugin capabilities for build or runtime smoke where the local environment allows it.
- Current mobile profile route, which is still the honest place to observe diagnostics.

## Existing Logic Checked

- The app now exposes runtime, permission, and captured notification diagnostics on the student profile route.
- The repository has a `qa:mobile-native-push-readiness` gate, but nothing yet that distinguishes what simulator/emulator smoke can honestly prove.
- There is still no repo-owned condensed manual checklist for the final physical-device validation handoff.

## Review Outcome

Build the smallest simulator/emulator follow-up slice that:

- codifies what local native smoke can still prove before a physical-device push test
- reuses official Expo development-build guidance instead of inventing a new flow
- adds a focused audit and QA wrapper for simulator/emulator readiness if that state is not yet measurable
- produces a short final manual checklist for the user instead of leaving a long ambiguous setup trail
- keeps the broader UI redesign and full store/deploy work out of scope
