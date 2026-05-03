# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-camera-events-preview-polish`
- **Scope:** Fix native scanner camera permission metadata, remove the impractical manual token scanner fallback, and make event taps open rich previews with reliable cover imagery.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/src/components/app-icon.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/student/events/index.tsx`

## Existing Logic Checked

- `app.config.ts` already configures the `expo-camera` plugin, but the iOS `infoPlist` does not explicitly include `NSCameraUsageDescription`.
- `BusinessScannerScreen` still exposes a manual token textarea even though production QR tokens are too long for real venue staff to type or paste safely.
- Student event cards currently navigate directly to a detail route; the requested behavior is a pop-up preview on tap.
- Event cards already use `getEventCoverSource`, so missing uploaded covers should keep a themed fallback image rather than an empty visual.

## Risks

- Native config changes require rebuilding/reinstalling the dev client; Metro refresh alone cannot add Info.plist keys.
- Removing manual fallback must not remove the shared `submitScanAsync` camera QR path.
- Event preview modal must not accidentally join an event; joining remains an explicit button action.
- Event imagery should use the same cover fallback helpers so first load never shows a blank card when an event has no uploaded image.

## Review Outcome

Add explicit iOS camera usage metadata, keep scanner operation camera-first, remove manual token UI/copy, and make student event cards open a detail preview modal while preserving a separate explicit detail/open/join action.
