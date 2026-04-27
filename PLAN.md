# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/reward-edge-function`
- **Goal:** Implement the Phase 2 `claim-reward` Edge Function.

## Architectural Decisions

- Use Supabase Edge Functions with `Deno.serve`.
- Keep shared logic under `supabase/functions/_shared`.
- Use `SUPABASE_SERVICE_ROLE_KEY` only inside Edge Functions for privileged reads/RPC calls.
- Authenticate callers by extracting the Bearer token and calling `supabase.auth.getUser(token)`.
- Let `claim_reward_atomic` own reward authorization, duplicate protection, stock locking, inventory increment, and audit logging.
- Keep reward-specific business outcomes in the JSON response body with stable `status` values and human-readable `message`.
- Configure `verify_jwt = false` for this function and perform explicit auth inside the function, matching the existing Edge Function pattern in the repo.

## Alternatives Considered

- Direct client writes to `reward_claims`: rejected because reward claiming must stay behind RPC authorization and duplicate protection.
- A generic CRUD-style reward claim endpoint: rejected because we want a narrow contract around `claim_reward_atomic`.
- Implement staff QR verification for reward handoff now: deferred until the separate reward scanner/mobile flow exists in later phases.

## Edge Cases

- Missing or malformed JSON body.
- Missing Authorization header.
- Invalid `eventId`, `studentId`, or `rewardTierId`.
- Optional `notes` field sent with invalid type.
- Caller authenticated but not allowed to claim rewards for the event.
- Reward tier not found or not active for the event.
- Student does not yet have enough valid leimas.
- Reward inventory is depleted.
- Reward already claimed by this student.

## Validation Plan

- Run `supabase db reset`.
- Run `supabase functions serve`.
- Call `claim-reward` with the seeded organizer account and seeded student/event/reward IDs.
- Verify duplicate reward claim returns a stable status.
- Verify a not-enough-stamps scenario returns a stable status.
- Verify invalid Bearer token returns `UNAUTHORIZED`.
