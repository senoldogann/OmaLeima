# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `chore/full-role-review-handoff`
- **Scope:** Capture the current evidence-based role/platform review state after scanner, media, and announcement feed work.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Existing Logic Checked

- `apps/mobile/src/app/_layout.tsx` registers `club`, so the old report item about missing club root stack registration is no longer valid.
- `cancel_event_registration_atomic` exists and student detail uses `useCancelEventRegistrationMutation`, so student event cancellation is no longer missing.
- `qr_token_uses` select policies for platform admins, event managers, and business staff exist in `20260503103000_report_verified_integrity_fixes.sql`.
- Business application insert policy is now limited to authenticated users instead of anonymous public inserts.
- Scan stamp paths now call `update_event_leaderboard`, and `scan-qr` counts successful push results with `filter(...).length`.
- Announcement feed backend includes published visibility, acknowledgements, impressions, notification preferences, popup bridge, push sender, mobile organizer authoring, and full student/business feed routes.
- iOS native permission strings exist in `apps/mobile/app.config.ts` and `apps/mobile/ios/OmaLeima/Info.plist`, but physical devices are still offline in `xcrun xctrace list devices`.

## Risks

- Native iOS camera permission cannot be verified until a physical iPhone is online and the app is rebuilt/reinstalled.
- Media upload/render fixes are code and data-cleanup verified, but real organizer/business smoke still needs a physical device session.
- Business slider/popup behavior is implemented and export-verified, but final visual acceptance needs user/device review.
- Full role review cannot be considered complete until physical scanner/media smoke results are available.

## Review Outcome

No new code defect was found in the current static review. The remaining goal blockers are device availability and physical smoke evidence, not an obvious missing code path.
