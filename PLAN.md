# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-event-detail-and-join`
- **Goal:** Add a real student event detail route and a secure join flow that respects deadline and capacity rules.

## Architectural Decisions

- Keep the slice focused on one event path:
  1. list screen links into detail
  2. detail screen reads event, joined venues, reward tiers, and own registration
  3. join action runs through a database atomic RPC
- Add a nested stack under the student events tab so event detail can push over the list without creating a second visible tab. This follows Expo Router's current nested tab + stack guidance.
- Replace permissive client registration writes with one shared registration primitive in the database. The same rule path should also be reused by `generate-qr-token` when it needs to auto-register a student.
- Enforce these rules in the atomic registration path:
  1. authenticated active profile only
  2. event must exist and be public
  3. event status must be joinable
  4. join deadline and start time must still be open
  5. max participant limit must be checked under a row lock
- Keep the mobile detail UI operational:
  1. clear registration status
  2. clear join disabled reason
  3. venue list and reward tiers visible before QR work starts

## Alternatives Considered

- Keeping join as a direct `event_registrations` insert from the mobile client: rejected because it leaves deadline and capacity checks outside zero-trust backend enforcement.
- Creating a separate Edge Function for student event join right now: rejected because a security-definer RPC is enough for the current write and keeps the mobile client surface smaller.
- Shipping detail UI without updating `generate-qr-token`: rejected because QR generation would still be able to bypass the new join rule path.

## Edge Cases

- The student opens a valid event that has no joined venues yet.
- Reward tiers exist but inventory is already fully claimed.
- The student is already registered, cancelled, or banned.
- Two students race for the last seat.
- The event is visible but its join deadline is already closed.
- The active event seed cannot be used for join success validation because its join window is already over.

## Validation Plan

- Run `supabase db reset` so the new registration RPC and policy changes are applied from scratch.
- Run `npm run lint` in `apps/mobile`.
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run export:web` in `apps/mobile`.
- Run local Supabase-authenticated smoke checks for:
  1. successful join on a future public event
  2. repeat join returning already-registered
  3. closed join window
  4. full event rejection
- Verify `generate-qr-token` still succeeds for the seeded registered student and reuses the shared registration rule path for unregistered students.
- Start the local web preview and verify both the list route and the new event detail route render cleanly after the navigation changes.
