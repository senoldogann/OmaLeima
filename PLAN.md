# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-camera-events-preview-polish`
- **Goal:** Fix scanner native camera permission, remove impossible manual token scanning, and show event details in a pop-up before deeper navigation.

## Architectural Decisions

- Add `NSCameraUsageDescription` directly to `ios.infoPlist` so iOS native camera service metadata is present even when plugin mutation is not enough for a given dev build.
- Keep camera scanning as the only business scanner input path; QR token typing is not a realistic event-day workflow.
- Update timeout copy to tell staff to retry with a fresh scan instead of suggesting manual fallback.
- Add a student event preview modal fed by the existing `StudentEventSummary` data and shared cover fallback helpers.
- Preserve the current detail route behind an explicit modal action for users who want the full event screen.

## Edge Cases

- Existing dev clients need a native rebuild before the new camera permission string appears.
- If camera permission is denied, the existing permission CTA remains the only recovery path.
- If an event has no uploaded cover, preview and cards render a themed fallback image.
- If a student is not registered, joining is still a separate button press and never triggered by opening the modal.
- If event description is missing, the preview shows a clear empty-state sentence.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
