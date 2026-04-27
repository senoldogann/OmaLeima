# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/qr-edge-functions`
- **Goal:** Implement the first Phase 2 QR Edge Functions: `generate-qr-token` and `scan-qr`.

## Architectural Decisions

- Use Supabase Edge Functions with `Deno.serve`.
- Keep shared logic under `supabase/functions/_shared`.
- Use `SUPABASE_SERVICE_ROLE_KEY` only inside Edge Functions for privileged reads/RPC calls.
- Authenticate callers by extracting the Bearer token and calling `supabase.auth.getUser(token)`.
- Sign QR payloads with HS256 using `QR_SIGNING_SECRET`.
- Keep QR token payload stable: `sub`, `eventId`, `typ`, `iat`, `exp`, `jti`.
- Let `scan_stamp_atomic` own all stamp mutation and concurrency-sensitive behavior.
- Configure `verify_jwt = false` for these functions and perform explicit auth inside the function, matching current Supabase auth guidance.

## Alternatives Considered

- Direct client writes to `event_registrations`, `qr_token_uses`, or `stamps`: rejected because critical writes must remain server-side/RPC-controlled.
- Rely on gateway JWT verification only: rejected because current Supabase guidance favors explicit auth patterns and we need custom QR token verification too.
- Add all Phase 2 functions now: rejected to keep scope small and testable.
- Add atomic event registration RPC now: deferred unless capacity race risk becomes urgent; first pass keeps explicit checks and DB unique constraint.

## Edge Cases

- Missing or malformed JSON body.
- Missing Authorization header.
- Suspended/deleted profile.
- Unknown, unavailable, ended, or full event.
- Already registered student.
- Invalid QR payload shape.
- Modified QR token signature.
- Expired QR token.
- Authenticated scanner without active business staff membership.
- QR replay and duplicate stamp responses from `scan_stamp_atomic`.

## Validation Plan

- Set local `QR_SIGNING_SECRET`.
- Run `supabase db reset`.
- Run `supabase functions serve`.
- Call `generate-qr-token` with the seeded student account.
- Call `scan-qr` with the seeded scanner account and generated token.
- Verify duplicate scan/replay behavior returns stable error codes.
