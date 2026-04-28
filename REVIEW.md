# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/phase-6-concurrency-and-jwt-hardening`
- **Scope:** Phase 6 function-backed security smokes for QR/JWT abuse and duplicate-scan race protection.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `README.md`
- `apps/admin/README.md`
- `apps/admin/package.json`
- `apps/admin/scripts/*`
- `docs/EDGE_FUNCTIONS.md`
- `docs/TESTING.md`
- `tests/*`
- root `package.json`

## Risks

- JWT and QR security regressions can hide behind generic 400 responses unless the smoke scripts assert the exact backend status codes.
- Race-condition tests are easy to write badly. If the concurrent scan smoke reuses seeded event data without cleanup, reruns become flaky and stop proving anything.
- Function-backed smokes depend on a separately served local Edge Functions process. Without clear preflight checks, the new expanded QA path becomes frustrating and misleading.
- A duplicate-scan race smoke must verify both HTTP statuses and persistent side effects. Otherwise we could miss double-write regressions in `stamps`, `qr_token_uses`, or `audit_logs`.
- We should keep this slice focused on explicit JWT abuse and duplicate scan protection, not stretch into leaderboard load or broader event-day ops yet.

## Dependencies

- Existing admin smoke scripts in `apps/admin/scripts`.
- Existing local Supabase reset flow, local function server flow, and seeded accounts.
- `generate-qr-token`, `scan-qr`, and shared QR JWT helpers under `supabase/functions`.
- Existing atomic replay protection in `scan_stamp_atomic`.
- Existing feature-level docs in `apps/admin/README.md`, `docs/EDGE_FUNCTIONS.md`, and `docs/TESTING.md`.

## Existing Logic Checked

- `generate-qr-token` explicitly rejects invalid bearer tokens, inactive profiles, unavailable events, and ended events.
- `scan-qr` explicitly rejects invalid bearer tokens, invalid or expired QR JWTs, missing business context, and business staff mismatches before hitting the atomic RPC.
- `scan_stamp_atomic` uses unique constraints on `qr_token_uses.jti` and `stamps.qr_jti` to collapse duplicate use into `QR_ALREADY_USED_OR_REPLAYED`.
- The current root QA flow still stops at the core matrix. Function-backed security smokes are documented but not yet orchestrated.

## Review Outcome

Build the next Phase 6 hardening slice that:

- adds explicit QR/JWT abuse smokes for invalid bearer, tampered token, expired token, invalid token type, and wrong-event venue mismatch
- adds a duplicate-scan race smoke that proves one success, one replay rejection, and single-row persistence
- adds an expanded function-backed QA entry point with preflight guidance for local function serving
- updates docs so future agents know which matrix covers core app QA versus Edge Function security QA
