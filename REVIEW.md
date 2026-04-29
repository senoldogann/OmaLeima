# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/store-release-readiness`
- **Scope:** Add a repo-owned store/public-launch readiness gate for the Expo mobile app and document the remaining owner steps.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `README.md`
- `docs/LAUNCH_RUNBOOK.md`
- `docs/TESTING.md`
- `apps/mobile/README.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/package.json`
- `apps/mobile/scripts/audit-store-release-readiness.mjs`
- `tests/run-mobile-store-release-readiness.mjs`

## Risks

- Store submission details change over time, so only repo-owned checks should be automated; account-only items must stay explicit in docs.
- A false-green store gate would be misleading if it pretended to prove App Store Connect or Play Console state.
- EAS build and submit config should stay minimal; we should not hardcode sensitive or owner-specific store identifiers into the repo.

## Dependencies

- Current Expo app config in `apps/mobile/app.config.ts`
- Current EAS config in `apps/mobile/eas.json`
- Current launch guidance in `README.md`, `docs/LAUNCH_RUNBOOK.md`, and `docs/TESTING.md`
- Official Expo documentation for EAS Build, EAS Submit, app versions, and permissions

## Existing Logic Checked

- The project already has working iOS dev-build proof, Android emulator fallback, and pilot operator hygiene gates.
- The remaining broader-launch gap is not product logic; it is whether the mobile app repo is shaped correctly for store builds and later submissions.
- `apps/mobile/app.config.ts` already contains bundle/package identifiers, icons, notifications, camera permission text, and EAS project wiring.
- `apps/mobile/eas.json` currently has build profiles but does not yet expose an explicit repo-owned store-readiness gate.

## Review Outcome

Ship a narrow store-readiness follow-up that:

- adds one local audit for Expo config and EAS build/release wiring
- keeps store-account and listing work clearly documented as owner-owned tasks
- avoids hardcoding App Store Connect or Google Play account identifiers into the repo
