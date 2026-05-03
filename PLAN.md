# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/business-media-scanner-home-polish`
- **Goal:** Fix the remaining scanner native/runtime issues and make business event/media surfaces visually trustworthy.

## Architectural Decisions

- Add `NSCameraUsageDescription` and the matching location usage string to the checked-in native iOS `Info.plist` because this repo currently has an `ios/` project and Xcode installs from that file.
- Treat scanner location proof as optional: if the installed dev build does not expose `expo-location` permission methods, show a calm unsupported state and keep QR scanning available.
- Extend `CoverImageSurface` with an explicit fallback image source so uploaded-media screens never collapse into a black rectangle when a remote URL is missing, slow, or rejected.
- Replace business home joined event rows with an auto-advancing horizontal visual rail using the same event cover helper as the dedicated business events page.
- Make the business profile editor collapsible so staff can open/close the heavy form instead of always seeing every field.
- Keep the Instagram-like announcement feed out of this bugfix slice and queue it as its own product feature because the current announcement system is popup/push oriented.

## Edge Cases

- Existing installed dev clients still need reinstall after plist changes.
- Location proof can be unsupported without blocking scanner camera access.
- Uploaded remote media can fail; fallback imagery must keep the UI inspectable.
- Scanner role can view business profile but cannot edit owner/manager fields.
- Business event rail must keep access to the full business events screen.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
