# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-staff-pin`
- **Scope:** Add optional staff PIN verification to registered scanner devices.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/scanner/scanner.ts`
- `apps/mobile/src/features/scanner/scanner-device.ts`
- `apps/mobile/src/features/scanner/scan-transport.ts`
- `apps/mobile/src/features/scanner/types.ts`
- `supabase/functions/scan-qr/index.ts`
- `supabase/migrations/20260503150000_scanner_staff_pin.sql`

## Existing Logic Checked

- `business_scanner_devices` records device identity and is readable by active business staff.
- PIN hashes must not live in `business_scanner_devices`, because staff clients can select that table.
- Current scan flow sends `scannerDeviceId` but no staff PIN context.
- Edge `scan-qr` validates request shape and calls `scan_stamp_atomic`.
- `scan_stamp_atomic` is the correct place for server-side scan authorization checks.

## Risks

- PIN must be optional per scanner device and should not block businesses that do not enable it.
- Plaintext PIN must only travel with the scan/setup request and never be stored.
- PIN hashes must be hidden behind security-definer RPCs, not readable through client SELECT.
- Scanner UI must ask for PIN only when the registered device requires it.
- New scan status codes must be typed across edge, transport, and UI.

## Review Outcome

Add hidden scanner PIN storage, PIN setup/clear RPCs, scan-time PIN verification in `scan_stamp_atomic`, and a compact mobile setup + scanner prompt.
