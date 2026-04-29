# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/mobile-diagnostics-cleanup`
- **Scope:** Clean up the remaining mobile diagnostics debt from the physical-device smoke by classifying the current iPhone dev-client runtime correctly and making push diagnostics refresh visibly react in the profile route.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/lib/push.ts`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/scripts/audit-native-push-device-readiness.mjs`
- `apps/mobile/README.md`
- `docs/TESTING.md`

## Risks

- The runtime label should become more accurate without falsely claiming that Expo Go or web counts as a real native push runtime.
- The refresh button fix should give the user visible feedback without changing the underlying push registration logic or notification capture behavior.
- The native push readiness audit must stay aligned with the profile diagnostics copy or it will produce false failures.

## Dependencies

- Existing runtime classification helper in `apps/mobile/src/lib/push.ts`
- Existing diagnostics provider in `apps/mobile/src/features/push/native-push-diagnostics.tsx`
- Existing profile diagnostics surface and native push readiness audit

## Existing Logic Checked

- `readPushRuntimeMode()` currently falls back to `bare` whenever `expo-constants` does not report `StoreClient`, even though the user’s physical iPhone smoke is running through a dev client
- `handleRefreshPushDiagnosticsPress()` currently refreshes permission state but leaves no visible loading or success feedback, so the button looks inert when nothing changes
- `audit-native-push-device-readiness.mjs` still only checks the older diagnostics copy

## Review Outcome

Ship a small diagnostics follow-up that:

- classifies the current physical-device dev-client path as a development build when the Expo runtime signals are clearly coming from Metro plus an EAS project id
- gives the profile diagnostics refresh action visible loading or refreshed feedback
- updates the existing audit and docs so the diagnostics story stays honest after the smoke we just completed
