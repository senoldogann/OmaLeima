# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/reward-edge-function`
- **Scope:** Phase 2 reward claim Edge Function.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `supabase/config.toml`
- `docs/EDGE_FUNCTIONS.md`
- `supabase/functions/_shared/*`
- `supabase/functions/claim-reward/index.ts`

## Risks

- `claim-reward` must not allow unauthenticated callers or malformed payloads.
- Reward claiming must stay server-side; client code must not create `reward_claims` rows directly.
- The function must map RPC result statuses to stable app-facing messages so mobile and admin clients can branch cleanly.
- Notes should remain optional and explicit; null vs empty string handling should stay predictable.
- Error responses must use explicit status codes and stable app-level error codes.
- Local smoke tests must prove duplicate-claim and not-enough-stamps scenarios, not only success.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections 13 and 16.
- Existing Supabase schema and RPC functions from Phase 1.
- Supabase Edge Functions runtime with `Deno.serve`.
- Supabase JS client inside Edge Functions.

## Existing Logic Checked

- `claim_reward_atomic` already handles staff/admin authorization, reward tier locking, stamp count validation, stock checks, duplicate claim protection, inventory increment, and audit log insert.
- `seed.sql` creates one active event, one student, one business scanner, and one reward tier for smoke tests.
- Existing shared Edge Function helpers already cover POST enforcement, JSON parsing, bearer token extraction, runtime env loading, auth resolution, and UUID validation.

## Review Outcome

Implement only the next Phase 2 slice: `claim-reward`, reusing the shared Edge Function helper pattern and validating the RPC contract with local smoke tests.
