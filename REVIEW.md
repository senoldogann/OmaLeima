# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `bug/scanner-location-module-optional`
- **Scope:** Prevent the business scanner route from crashing when the installed iOS dev build does not include `expo-location`.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/scanner.tsx`

## Existing Logic Checked

- `scanner.tsx` statically imported `expo-location`, so old dev builds without the native module crashed before the route default export could initialize.
- Location proof is optional telemetry; scanning must continue without it.
- `app.config.ts` already includes the location plugin for rebuilt dev builds.

## Risks

- The route must not import/evaluate `expo-location` at module load time.
- Pressing the location proof button on an old dev build should show a recoverable error, not crash the scanner.
- Rebuilt dev builds should still use native location proof normally.

## Review Outcome

Move `expo-location` behind a dynamic import inside the optional native location proof path.
