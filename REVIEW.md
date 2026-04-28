# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/scanner-contract-hardening`
- **Scope:** Tighten the QR scanner contract between the mobile business flow and the `scan-qr` Edge Function, remove a dead backend branch, and document the IP header trust assumption without reopening broad UI work.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/features/scanner/types.ts`
- `apps/mobile/src/features/scanner/scan-transport.ts`
- `apps/mobile/src/app/business/scanner.tsx`
- `supabase/functions/scan-qr/index.ts`
- `supabase/functions/_shared/http.ts`
- `apps/admin/scripts/smoke-qr-security.ts`

## Risks

- The mobile scanner currently trusts any backend `status` string that looks shaped correctly, so contract drift can silently leak unsupported states into the UI.
- The business scanner title/detail maps must stay exhaustive once the mobile union expands.
- The `scan-qr` dead conditional is low risk but easy to miss if we do not re-run the existing QR security smoke after touching the function.

## Dependencies

- Existing `scan-qr` Edge Function behavior and the phase-6 QR security smoke that already verifies `INVALID_QR`, `INVALID_QR_TYPE`, `QR_EXPIRED`, and venue mismatch paths.
- The mobile business scanner flow under `apps/mobile/src/app/business/scanner.tsx`.
- Existing type-safe QR transport code in `apps/mobile/src/features/scanner`.

## Existing Logic Checked

- `scan-qr` can return `INVALID_QR_TYPE`, `NOT_BUSINESS_STAFF`, and `BUSINESS_CONTEXT_REQUIRED`, but the mobile scanner union does not currently include all of them.
- `requestScanQrAsync` maps any shaped error response into a scan result even when the status is not part of the intended business scanner contract.
- `getClientIp` reads `x-forwarded-for` first, then `cf-connecting-ip` and `x-real-ip`, but the trust boundary is not documented.
- The dead conditional in `scan-qr` is still present and easy to remove without behavioral risk.

## Review Outcome

Build the smallest scanner hardening slice that:

- makes the mobile business scanner contract explicit and exhaustive
- rejects unsupported backend statuses instead of silently treating them as valid scan results
- removes the dead backend status branch
- adds a short trust note around platform-managed forwarding headers
