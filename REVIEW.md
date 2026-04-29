# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/hosted-business-scan-smoke-readiness`
- **Scope:** Make the hosted business scanner smoke practical on a single physical iPhone by exposing the active student QR token in a development-only surface and documenting the hosted scanner fallback path.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/package.json`
- `package.json`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/features/auth/components/business-password-sign-in.tsx`
- `apps/mobile/scripts/audit-hosted-business-scan-readiness.mjs`
- `tests/run-mobile-hosted-business-scan-readiness.mjs`
- `apps/mobile/README.md`
- `docs/TESTING.md`

## Risks

- The active student QR token is sensitive and should not be exposed in normal product UI. Any new surface must stay development-only.
- We should not change the server-owned QR rotation or scanner transport logic while making the hosted smoke easier to run.
- The same-device smoke path needs to stay honest about what it does: manual token paste still exercises the real `scan-qr` backend, but it is a smoke helper rather than the final event-day camera path.

## Dependencies

- Existing student QR token rotation in `apps/mobile/src/app/student/active-event.tsx` and `apps/mobile/src/features/qr/student-qr.ts`
- Existing business scanner manual fallback in `apps/mobile/src/app/business/scanner.tsx`
- Hosted smoke fixture accounts and active event already prepared in the linked Supabase project

## Existing Logic Checked

- The student QR screen already has access to the raw JWT token through `qrTokenQuery.data.qrPayload.token`
- The business scanner already supports manual token paste against the real hosted `scan-qr` path
- The business password form still labels `scanner@omaleima.test / password123` as a local seed account even though it is now part of the hosted smoke path

## Review Outcome

Ship a small mobile QA follow-up that:

- adds a development-only QR diagnostics card for the active student event so the same device can copy or manually transcribe the current QR token
- adds a matching scanner-side note that explains the single-device hosted smoke path without changing production scanning behavior
- adds a focused repository audit plus docs so the same hosted smoke path stays repeatable after future mobile changes
