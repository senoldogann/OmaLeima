# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/device-token-functions`
- **Scope:** Phase 2 device token registration and first push test flow.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/EDGE_FUNCTIONS.md`
- `docs/DATABASE.md`
- `supabase/config.toml`
- `supabase/functions/_shared/env.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/validation.ts`
- `supabase/functions/_shared/expoPush.ts`
- `supabase/functions/register-device-token/index.ts`
- `supabase/functions/send-test-push/index.ts`

## Risks

- Device token registration must stay tied to the authenticated user and should not silently duplicate stale tokens.
- Expo push token handling should follow current Expo docs: client gets `ExpoPushToken`, server stores it, and push requests go to Expo Push API.
- We should not require a real mobile device for local smoke tests, so the first push flow needs a mockable push endpoint.
- Push test sends must stay narrow and safe; the first slice should only target the authenticated user's own enabled tokens.
- Notification spam rules exist in the product plan, so the test flow should remain explicitly manual and non-broadcast.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` push notifications, device token flow, and Edge Function sections.
- Existing `device_tokens`, `notifications`, `profiles`, and audit log tables.
- Existing shared Edge Function helpers for auth, HTTP, and validation.
- Current official Expo documentation for `getExpoPushTokenAsync` and Expo Push API sending.

## Existing Logic Checked

- `device_tokens` already supports `expo_push_token`, `platform`, `device_id`, `enabled`, and `last_seen_at`.
- RLS already allows users to manage their own device tokens directly, but Phase 2 requires the registration flow to move through Edge Functions.
- No push-related Edge Functions exist yet.

## Review Outcome

Implement the next Phase 2 slice with a narrow but real push backend: `register-device-token`, a shared Expo push helper, and a manual `send-test-push` flow that can be smoke-tested locally.
