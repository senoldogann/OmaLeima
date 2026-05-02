# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-device-audit`
- **Scope:** Add named scanner device audit identity before building fraud review actions.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/scanner/scanner-device.ts`
- `apps/mobile/src/features/scanner/scan-transport.ts`
- `apps/mobile/src/features/scanner/types.ts`
- `apps/mobile/src/app/business/scanner.tsx`
- `supabase/functions/scan-qr/index.ts`
- `supabase/migrations/20260503123000_scanner_device_audit.sql`

## Existing Logic Checked

- `scannerDeviceId` already exists in the mobile scanner request, scan edge function, `qr_token_uses`, and `stamps`.
- The current mobile scanner sends `"web-preview"` on web and `null` on native, so scan audit is not tied to a real business/device.
- `scan_stamp_atomic` stores `scanner_device_id` but does not verify it against any business-owned device registry.
- Business staff membership is already verified in both the edge function and `scan_stamp_atomic`.

## Risks

- Device identity is audit context, not an auth replacement; business staff auth must remain the primary authorization primitive.
- A stale or forged `scannerDeviceId` must not be accepted for another business.
- First scanner launch should register the device without forcing event-day staff through a long setup flow.
- If device registration fails, the scanner should stop before reading QR codes so audit data does not silently disappear.

## Review Outcome

Add a business-owned scanner device registry, auto-register the current install per business, validate non-null scanner device IDs in the atomic scan RPC, and surface the device status in the scanner UI.
