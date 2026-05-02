# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/scanner-location-consent`
- **Scope:** Continue the remaining scanner security queue by adding explicit location proof consent, location payload plumbing, and server-side distance anomaly scoring.

## Confirmed Current Scan Flow

- Student shows a signed dynamic QR for one event.
- Business staff scans it and calls `scan-qr`.
- `scan-qr` verifies the Supabase staff session and QR JWT signature/expiry/type.
- Backend resolves the scanner business context.
- `scan_stamp_atomic` verifies the event exists and is active, the student is registered, the business is joined to the event, the staff account belongs to the business, the QR JTI was not used, and the student has not already received a leima from that business for that event.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/scanner/scanner.ts`
- `apps/mobile/src/features/scanner/scan-transport.ts`
- `apps/mobile/src/features/scanner/types.ts`
- `supabase/migrations/20260503113000_scanner_location_proof.sql`

## Risks

- Location must be explicit and consent-based; no silent background location.
- Native location requires adding `expo-location`, but `apps/mobile/package.json` currently has user-owned script changes, so this slice must avoid dependency churn.
- Web preview location is useful for validating payload and backend scoring, but native location proof needs the next dependency slice.
- Distance scoring should not block legitimate scans; it should create review signals for admin/club oversight.

## Existing Logic Checked

- `scan-qr` already parses optional scanner latitude/longitude and forwards it to `scan_stamp_atomic`.
- `qr_token_uses` and `stamps` already have nullable scanner coordinate columns.
- `fraud_signals` already exists and is visible to platform admins and event managers.
- Scanner transport currently hardcodes `scannerLocation` to null values.

## Review Outcome

Add an explicit opt-in location proof panel to the scanner, send coordinates when the operator has chosen to share them, and add non-blocking fraud signals when a successful scan is far from the venue coordinates.
