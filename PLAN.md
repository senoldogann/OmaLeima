# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-events-list`
- **Goal:** Replace the student events placeholder with the first authenticated Supabase-backed list screen.

## Architectural Decisions

- Keep the scope narrow: this branch will only solve list discovery for authenticated students, not event detail, registration mutations, or QR.
- Fetch visible public events and the current student's own registrations as two bounded Supabase reads, then merge them on the client. This keeps RLS behavior explicit and avoids accidentally filtering out events the student has not joined yet.
- Limit the screen to current-useful statuses:
  1. active now
  2. upcoming and still relevant
- Derive presentational state on the client:
  1. timeline label
  2. registration badge
  3. join deadline copy
- Add a small feature module under `src/features/events` so future event detail and join flow code can build on the same types and helpers.
- Keep copy and layout operational, not marketing-like.

## Alternatives Considered

- Pulling event detail and rewards into the list query now: rejected because it would over-fetch and blur the next branch boundary.
- Creating mock local event data inside the app: rejected because the backend and seed data already exist and Phase 3 should start consuming real Supabase reads.
- Building register/cancel buttons in the same branch: rejected because mutation UX and capacity/join deadline rules deserve their own focused slice.

## Edge Cases

- The student has no visible events.
- The student has an active registration for an event that is no longer active.
- An event has no description or no max capacity.
- Query returns successfully but the student has no matching registration rows.
- Local auth is unavailable for manual UI verification, so query logic still needs a non-UI smoke check.

## Validation Plan

- Run `npm run lint` in `apps/mobile`.
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run export:web` in `apps/mobile`.
- Run a local Supabase-authenticated smoke query with the seeded student credentials to verify the events query shape and registration visibility.
- Start the local web preview and verify both the login route and the student events route still render cleanly after the events screen changes.
