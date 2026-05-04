# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `bug/scanner-duplicate-and-kiosk-home`
- **Scope:** Fix the physical-device scanner duplicate confusion and reduce the scanner account experience to an event-day camera-first flow.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/scanner/scan-transport.ts`
- `apps/mobile/src/features/scanner/types.ts`
- `supabase/functions/scan-qr/index.ts`

## Existing Logic Checked

- Remote DB inspection shows the reported physical-device scan produced a valid stamp for the student/event/business before the duplicate result, so the backend duplicate guard is protecting a real existing stamp.
- `scan_stamp_atomic` counts only `validation_status = 'VALID'` stamps and uses the event rules per-business limit, so revoked/manual review stamps are not causing this report.
- Scanner route still shows business/event/device/location panels before the camera; this is too busy for an event-day scanner account.
- Business home still asks scanner users to press `Open scanner`, even though scanner-only staff should land straight in the camera workflow when a live joined event exists.

## Risks

- Duplicate scans must not create a second valid stamp; the backend guard should remain atomic and strict.
- The duplicate result should be operationally clear, not look like a broken scan when a valid stamp already exists.
- Auto-opening the scanner should apply only to scanner-only business staff, not managers/owners who need the management home.
- Camera permissions and scanner PIN/device registration must still block scans before a request is sent.

## Review Outcome

Keep the backend duplicate protection, add existing-stamp context to the duplicate response, simplify the native scanner route so the camera is the primary surface, and make scanner-only users with a live joined event land directly on that scanner route from business home.
