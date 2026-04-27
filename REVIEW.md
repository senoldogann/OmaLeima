# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/send-push-notification`
- **Scope:** Phase 2 controlled promotion push notification endpoint.

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
- `supabase/functions/_shared/expoPush.ts`
- `supabase/functions/send-push-notification/index.ts`

## Risks

- Promotion pushes must only reach registered participants of the linked event.
- Business staff must only be allowed to send pushes for their own business promotions; platform admin can be the only global override.
- The anti-spam rule in the master plan says maximum two promotions per event per business.
- Re-sending the same promotion should not create duplicate notifications.
- Users may have multiple device tokens, but notification history should stay user-scoped.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` notification category, anti-spam, and promotion rules.
- Existing `promotions`, `event_venues`, `event_registrations`, `device_tokens`, `notifications`, and `business_staff` tables.
- Existing shared Edge Function helpers for auth, HTTP, and Expo push sending.
- Current official Expo push batching guidance and current Supabase explicit function auth guidance.

## Existing Logic Checked

- `register-device-token` already maintains push recipients at the token layer.
- `send-test-push` already proves single-user push delivery and notification writeback.
- `scheduled-event-reminders` already uses batched Expo sends and one notification row per user.
- `promotions` exists, is business-owned, and can be linked directly to an event.

## Review Outcome

Implement the remaining Phase 2 push slice with one controlled endpoint: `send-push-notification` should send `PROMOTION` pushes for an active event-linked promotion, target only registered participants with enabled tokens, enforce duplicate protection plus the max-2 business/event rule, and record one `PROMOTION` notification row per user.
