# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `bug/scanner-location-type-erasure`
- **Scope:** Make the business scanner route independent from every route-load reference to `expo-location` so older iOS dev builds do not crash before rendering.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/scanner.tsx`

## Existing Logic Checked

- `scanner.tsx` no longer has a value import for `expo-location`, but it still had a `typeof import("expo-location")` type alias in the route module.
- Metro/Babel can still surface native-module resolution issues in dev-client bundles when a route keeps module-level references to a missing native dependency.
- Location proof is optional telemetry; scanning must continue without it.
- `app.config.ts` already includes the location plugin for rebuilt dev builds.

## Risks

- The route must not import, type-import, or otherwise evaluate `expo-location` at module load time.
- Pressing the location proof button on an old dev build should show a recoverable error, not crash the scanner.
- Rebuilt dev builds should still use native location proof normally.

## Review Outcome

Keep `expo-location` fully inside the optional native location proof function and remove route-level type references.
