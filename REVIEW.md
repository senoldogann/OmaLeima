# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/qr-edge-functions`
- **Scope:** Phase 2 initial Edge Functions for QR generation and scanning.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `supabase/config.toml`
- `supabase/functions/_shared/*`
- `supabase/functions/generate-qr-token/index.ts`
- `supabase/functions/scan-qr/index.ts`

## Risks

- QR signing secret must never be exposed to clients.
- `generate-qr-token` must not allow suspended/deleted users.
- Capacity checks must avoid silent over-registration; current first pass can use DB constraints and explicit count, but high-concurrency capacity should be hardened with an atomic RPC later if needed.
- `scan-qr` must verify JWT signature, expiry, QR type, business staff membership, and then delegate mutation to `scan_stamp_atomic`.
- Error responses must use explicit status codes and stable app-level error codes.
- Local function tests require `supabase functions serve` plus local secrets for `QR_SIGNING_SECRET`.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections 9, 10, 11, 16, and 23.
- Existing Supabase schema and RPC functions from Phase 1.
- Supabase Edge Functions runtime with `Deno.serve`.
- Supabase JS client inside Edge Functions.
- JWT signing/verification library for HS256.
- Required secret: `QR_SIGNING_SECRET`.

## Existing Logic Checked

- `scan_stamp_atomic` already handles event active checks, registration checks, venue membership, staff authorization, QR replay, duplicate stamps, stamp insert, and audit log insert.
- `seed.sql` creates one active event, one student, one business scanner, and one reward tier for smoke tests.
- No Edge Functions exist yet.

## Review Outcome

Implement only the first Phase 2 slice: `generate-qr-token` and `scan-qr`, with shared response/auth/JWT helpers and local smoke validation.
