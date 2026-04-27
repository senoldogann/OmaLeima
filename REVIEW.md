# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/scheduled-event-reminders`
- **Scope:** Phase 2 scheduled event reminder job and production-shaped push fan-out.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/EDGE_FUNCTIONS.md`
- `docs/DATABASE.md`
- `supabase/migrations/*notification_indexes*.sql`
- `supabase/config.toml`
- `supabase/functions/_shared/env.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/expoPush.ts`
- `supabase/functions/send-test-push/index.ts`
- `supabase/functions/scheduled-event-reminders/index.ts`

## Risks

- Reminder jobs must never spam users with duplicate 24h or 2h reminders for the same event.
- Scheduled functions should not be callable by arbitrary public clients.
- Expo push fan-out should respect current Expo guidance for batch sending and temporary failure retries.
- Users may have zero, one, or multiple enabled device tokens, so reminder writes should stay user-scoped while push delivery stays token-scoped.
- Failed delivery attempts should be retryable on the next cron run instead of being treated as a permanent success.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` scheduled reminder, push notification, and anti-spam sections.
- Existing `events`, `event_registrations`, `device_tokens`, `notifications`, and `profiles` tables.
- Existing shared Edge Function helpers for env, HTTP, and Expo push sending.
- Current official Supabase scheduled Edge Function guidance and current Expo Push API guidance.

## Existing Logic Checked

- `register-device-token` already maintains enabled token state per user and device.
- `send-test-push` already records push outcomes into `notifications`.
- `notifications` currently lacks an event/type/user-focused index for reminder dedupe checks.
- No scheduled Edge Function exists yet for reminder delivery.

## Review Outcome

Implement the next Phase 2 slice with one cron-ready reminder function: secure scheduled invocation, due-event selection for 24h and 2h windows, Expo batch delivery with retry support, and duplicate protection through notification history checks.
