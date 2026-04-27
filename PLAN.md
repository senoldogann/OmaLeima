# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/device-token-functions`
- **Goal:** Implement `register-device-token` and the first server-side Expo push test flow.

## Architectural Decisions

- Keep registration and push logic in Edge Functions, with the database as the device token source of truth.
- Reuse the shared auth/http helper pattern and add one Expo push helper for token validation and HTTP sending.
- Make token registration idempotent by upserting on `expo_push_token` and refreshing `last_seen_at`.
- If `deviceId` is supplied, disable older tokens for the same user/device pair to reduce stale duplicates.
- Keep the first send flow manual and self-targeted: authenticated user triggers a test push to their own enabled tokens.
- Make Expo Push API URL and access token configurable so local smoke tests can target a mock server.

## Alternatives Considered

- Relying only on direct client writes to `device_tokens`: rejected because Phase 2 is where we standardize server-owned write surfaces.
- Sending real pushes to Expo in local smoke tests: rejected because it requires real device tokens and credentials, which makes the test fragile.
- Building the full scheduled notification engine now: rejected because the next smallest useful slice is registration plus one manual push path.

## Edge Cases

- Missing or malformed JSON body.
- Missing or malformed `expoPushToken`.
- Token string that is not an Expo push token.
- Same user re-registering the same token repeatedly.
- Same device re-registering with a rotated token.
- User triggering a test push with no enabled tokens.
- Expo Push API returning an application-level error ticket.

## Validation Plan

- Run `supabase db reset`.
- Start `supabase functions serve`.
- Start a local mock push server reachable from the Edge runtime container.
- Call `register-device-token` with the seeded student account and verify the DB row is created or updated.
- Re-register the same device with a rotated token and verify the old token is disabled.
- Call `send-test-push` with the seeded student account and verify a `notifications` row is written with `SENT`.
- Stop the mock push server once to verify transport failures return `PUSH_SEND_FAILED`.
- Verify invalid Bearer token and invalid token format both fail safely.
