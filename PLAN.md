# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-business-join-and-scanner-foundation`
- **Goal:** Add the first real business event join action and a scanner screen foundation with live scan state handling.

## Architectural Decisions

- Keep this slice inside the Phase 4 mobile app, but add the minimum backend primitive it needs:
  1. a concurrency-safe RPC for business event join
  2. no leave RPC yet
- Split the business flow into two focused screens:
  1. `business/events` for joined plus joinable event context
  2. `business/scanner` for active joined-event selection and QR scanning
- Reuse the existing `business/home` read model where it helps, but add a richer business-events read model instead of overloading the home route.
- Join actions should go through a typed Supabase RPC path, not direct `event_venues` writes, because RLS currently does not allow business staff inserts.
- Scanner UX should be stateful and explicit:
  1. selected joined active event
  2. camera permission state
  3. locked scan while request is in flight
  4. 4-second timeout path
  5. result card with color-coded states
  6. manual pasted-token fallback for web and local smoke checks
- Always send `businessId` to `scan-qr` from the mobile client so multi-business staff accounts scan in the correct venue context.

## Alternatives Considered

- Building scanner UI without a real scan request path: rejected because the user value of this slice is the networked scan state machine, not a decorative camera frame.
- Deferring business join until a later branch: rejected because Phase 4 home still needs a real path from opportunity discovery to venue participation.
- Implementing join via direct mobile inserts: rejected because the database ownership model intentionally blocks that path.
- Adding leave flow in the same branch: rejected because join plus scanner already covers the critical forward path and keeps the blast radius smaller.

## Edge Cases

- Business staff account belongs to multiple businesses and needs explicit business context for scan requests.
- User has joined upcoming events but no active joined event to scan yet.
- Camera permission is denied or unavailable on the current platform.
- QR request hangs longer than 4 seconds and scanner must unlock cleanly.
- `scan-qr` returns `ALREADY_STAMPED`, `QR_EXPIRED`, `INVALID_QR`, `VENUE_NOT_IN_EVENT`, or `EVENT_NOT_ACTIVE`.
- Business tries to join an event after `join_deadline_at` or after `start_at`.
- Business already has a `JOINED` row for the same event.
- Existing `LEFT` or `REMOVED` venue rows should be revived only if the join rules still allow it.

## Validation Plan

- Run `apps/mobile` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run export:web`
- Reset local Supabase and run auth-backed smoke checks for:
  1. business join RPC success
  2. already joined protection
  3. join blocked after deadline or after start
  4. scanner request success with seeded QR
  5. scanner timeout state helper
  6. result-state handling for at least one non-success scan status
- Open the local web preview and verify:
  1. `/business/events`
  2. `/business/scanner`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
