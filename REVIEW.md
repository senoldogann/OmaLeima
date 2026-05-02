# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/native-scanner-location-proof`
- **Scope:** Finish native foreground location proof for the business scanner after the consent/payload/backend fraud slice.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/src/app/business/scanner.tsx`

## Existing Logic Checked

- Scanner already has an explicit opt-in location proof panel.
- Scanner transport already forwards nullable `scannerLocation`.
- Backend already stores scanner coordinates and creates non-blocking distance anomaly fraud signals.
- `apps/mobile/package.json` still includes user-owned `android` and `ios` script changes. Only the `expo-location` dependency should be staged from that file.

## Risks

- Native location must only be requested after the operator taps the location proof button.
- Permission copy must explain event-day fraud review, not general tracking.
- Dependency changes must not accidentally stage unrelated local script edits.
- Location denial must not block QR scans.

## Review Outcome

Add Expo Location with SDK-compatible version, configure permission text, and use native foreground location only from the existing explicit scanner opt-in action.
