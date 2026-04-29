# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/android-emulator-smoke-fallback`
- **Goal:** Clarify the Android fallback path when there is no physical Android phone: use the emulator for flow and UI smoke now, and keep remote push as an explicitly deferred real-device proof.

## Architectural Decisions

- Keep this slice documentation-first.
- Update the existing launch and testing docs instead of creating a new Android-only note.
- Narrow the wording from broad “Android physical-device smoke pending” to the more accurate “Android remote-push physical-device smoke pending.”
- Add a practical emulator checklist so the user can still validate Android UI and product flows now.

## Alternatives Considered

- Treating Android as fully blocked until a real phone appears:
  - rejected because emulator coverage can still de-risk auth, routing, QR, and scanner UI behavior
- Treating emulator coverage as a full replacement for Android launch confidence:
  - rejected because Expo's official push docs still require a real device for push verification
- Adding a new standalone Android document:
  - rejected because this belongs inside the existing testing and launch docs

## Edge Cases

- The docs should help the user today even if `adb` is not installed locally.
- The emulator checklist should clearly distinguish what can be proven without FCM-backed delivery.
- The private-pilot recommendation should stay flexible: iPhone-first pilot can continue while Android remote push remains open.

## Validation Plan

- Update `README.md`, `docs/TESTING.md`, `docs/LAUNCH_RUNBOOK.md`, and `apps/mobile/README.md`.
- Run a focused wording sanity pass with `rg`.
- Update `PROGRESS.md` and the working docs.
