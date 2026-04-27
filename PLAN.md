# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/send-push-notification`
- **Goal:** Implement the remaining Phase 2 push API as a controlled promotion notification endpoint.

## Architectural Decisions

- Implement `send-push-notification` as an authenticated user endpoint with explicit bearer auth, matching the rest of Phase 2.
- Keep the first production-shaped slice narrow: only `PROMOTION` notifications backed by an existing `promotions` row.
- Allow active business staff for the promotion’s business and active platform admins; reject unrelated organizers and students.
- Require the promotion to be `ACTIVE`, event-linked, and attached to a joined event venue before sending.
- Enforce anti-spam with two checks:
  1. same promotion cannot be sent twice
  2. max 2 successful promotions per event per business
- Target only registered participants with enabled device tokens and write one `PROMOTION` notification row per user.
- Reuse batched Expo delivery and return a summary with sent/failed/skipped counts.

## Alternatives Considered

- Building a generic multi-type push DSL now: rejected because the smallest grounded slice is promotion delivery.
- Letting client apps write `notifications` directly for promotions: rejected because recipient selection, auth, and spam limits are server-owned rules.
- Sending promotions to all users with tokens: rejected because the master plan limits promotions to event participants only.

## Edge Cases

- Missing or invalid bearer token.
- Promotion exists but is not `ACTIVE`.
- Promotion is not linked to an event.
- Business is not joined to that event.
- Promotion already sent once.
- Business already used its two promotion sends for that event.
- Event has registered participants but none with enabled device tokens.

## Validation Plan

- Run `supabase db reset`.
- Start `supabase functions serve`.
- Start a local mock push server reachable from the Edge runtime container.
- Register a device token for the seeded student.
- Insert active promotions for the seeded business and seeded event.
- Call `send-push-notification` with an invalid bearer token and verify it fails safely.
- Call it as the seeded business staff user and verify the first promotion sends successfully.
- Call the same promotion again and verify duplicate protection blocks it.
- Call a second promotion and verify it still succeeds.
- Call a third promotion for the same event/business and verify the max-2 rule blocks it.
- Call it as the seeded organizer and verify access is denied.
