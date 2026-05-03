# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/business-media-scanner-home-polish`
- **Scope:** Fix native scanner permission metadata in the checked-in iOS project, make location proof degrade cleanly on old dev builds, improve business home event cards into an image rail, and make uploaded business/club media avoid black empty surfaces.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/ios/OmaLeima/Info.plist`
- `apps/mobile/src/components/cover-image-surface.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/app/club/profile.tsx`
- `apps/mobile/src/app/club/events.tsx`

## Existing Logic Checked

- The generated checked-in native iOS `Info.plist` does not yet include `NSCameraUsageDescription`, so Xcode-installed builds can still crash even though `app.config.ts` contains the key.
- `BusinessScannerScreen` dynamic `expo-location` loading can return a JS module whose permission method is unavailable in older dev builds; the current UI surfaces a raw method error.
- Business home still renders joined events as text rows, not the requested image-backed rail.
- `CoverImageSurface` only falls back to a plain themed surface when a remote upload URL fails, which looks like a black empty image in dark mode.
- Announcement foundation exists: web admin has `/admin/announcements`, organizer web has `/club/announcements`, and mobile has an active announcement popup bridge. A persistent Instagram-like feed is not implemented yet.

## Risks

- Native plist changes still require reinstalling the iOS app.
- Location proof is optional and must not block scanner operation when unavailable.
- Image fallback changes should not hide valid uploaded media; they only cover missing/failed/slow media.
- Business profile collapsible sections must keep owner/manager edit permissions unchanged.

## Review Outcome

Patch the native plist directly, guard optional location APIs, move business home events to an auto-advancing image rail, add image fallbacks to uploaded-media surfaces, and document the announcement feed gap for the next product slice.
