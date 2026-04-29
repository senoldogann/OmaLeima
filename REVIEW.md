# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/android-emulator-smoke-fallback`
- **Scope:** Formalize Android emulator fallback as the current non-blocking path: what it can verify today, what it cannot prove, and how that changes the real next step without derailing the main product flow.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/LAUNCH_RUNBOOK.md`
- `README.md`
- `docs/TESTING.md`
- `apps/mobile/README.md`

## Risks

- We must not overclaim Android readiness when Expo's official guidance still treats remote push as a real-device-only path.
- The user has no Android phone right now, so the docs need a useful fallback path instead of just repeating an impossible requirement.
- The main product roadmap should still point to the next engineering step after this clarification.

## Dependencies

- Existing native simulator audit and mobile README notes
- Current launch guidance in `docs/LAUNCH_RUNBOOK.md`
- Expo's current official documentation for push notifications and development builds

## Existing Logic Checked

- The project already passed hosted mobile auth, push, QR rotation, manual scanner fallback, stamp creation, and reward-unlock push on a real iPhone.
- The repo already has a `native-simulator-smoke` wiring audit, but the launch docs still frame Android mainly as a physical-device gap.
- `adb` is not even present on the current machine, which reinforces that emulator fallback should stay documentation- and workflow-oriented, not pretend we already ran a full Android device gate.

## Review Outcome

Ship a documentation follow-up that:

- explicitly says Android emulator is useful now for app flow smoke
- explicitly says Android remote push is still an open real-device-only risk
- keeps the next technical step honest: emulator coverage now, borrowed Android hardware later only if Android launch scope requires it
