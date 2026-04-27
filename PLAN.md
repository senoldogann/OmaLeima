# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/scheduled-event-reminders`
- **Goal:** Implement the first cron-ready event reminder delivery flow.

## Architectural Decisions

- Keep scheduled reminder delivery in a dedicated Edge Function so the job can be called by Supabase Cron without coupling it to user-auth endpoints.
- Protect the scheduled function with a shared secret header stored in function environment variables.
- Reuse the shared Expo push module, but extend it for batch sends and limited retry behavior on transport, `429`, and `5xx` failures.
- Query due events in two explicit windows: `24h` and `2h`, each with a fixed 30-minute tolerance so repeated cron runs remain deterministic.
- Deduplicate reminders by reading successful notification history for the same `user_id + event_id + reminderWindowHours`.
- Write one `notifications` row per user reminder, even if the user has multiple device tokens.
- Add narrow reminder-related indexes instead of introducing new tables.

## Alternatives Considered

- Reusing `send-test-push` for cron delivery: rejected because it is user-scoped and intentionally manual.
- Making the scheduled function public with `verify_jwt = false` and no extra guard: rejected because cron endpoints should not be anonymously callable.
- Creating a new reminder ledger table: rejected because `notifications` already provides the history we need for duplicate protection.

## Edge Cases

- Missing or invalid scheduled job secret.
- No events currently due for either reminder window.
- Registered user has no enabled device token.
- Event reminder already sent successfully in an earlier cron run.
- Expo Push API transport outage during one cron run and success on the next retry or next cron run.
- One user having multiple enabled tokens with mixed success and failure results.

## Validation Plan

- Run `supabase db reset`.
- Start a local mock push server reachable from the Edge runtime container.
- Start `supabase functions serve`.
- Register a device token for the seeded student account.
- Insert one event due in the next 24 hours and one event due in the next 2 hours, both with registered student participation.
- Call `scheduled-event-reminders` with an invalid secret and verify it fails safely.
- Call `scheduled-event-reminders` with the valid secret and verify both reminders are sent and written to `notifications`.
- Call the same function again and verify duplicate reminders are skipped.
- Stop the mock push server once and verify a due reminder writes `FAILED` and returns retryable failure counts.
