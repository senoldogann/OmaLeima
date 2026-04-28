# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-event-creation`
- **Goal:** Add the next real club organizer workflow: create events from the web panel.

## Architectural Decisions

- Keep club reads on the server with the existing SSR Supabase client, then hand only serializable club and event records into a small client component for form state.
- Extend the existing club shell instead of creating a second layout pattern. The new route should feel like a direct part of `/club`.
- Use a compact read model with summary cards plus bounded lists:
  1. active clubs the organizer can operate
  2. draft or upcoming events for those clubs
  3. recent event creation activity
- Keep list limits explicit in UI copy so operators can see when a panel is showing “latest N” rather than the entire dataset.
- Back event creation with a DB atomic function, then call it from a club route handler. This keeps auth on the server, gives stable slug-collision behavior, and lets audit logging stay in the same transaction.
- For smoke, create deterministic event rows through the real route and validate them via organizer-auth reads. Do not add production-only test hooks.
- Validation for this slice must include:
  1. route-level access checks for `/club/events`
  2. organizer create flow succeeds for an owned club and returns stable event identifiers
  3. invalid payloads fail early at the route boundary
  4. student or non-club users cannot create events through the route
  5. created event becomes visible through the organizer read model
  6. concurrent organizer submissions with the same event name still produce unique slugs
  7. standard `lint`, `typecheck`, and `build`
- CI, higher-volume load work, and GTM rollout details should be documented more explicitly after this slice, but not expanded into unrelated implementation work here.

## Alternatives Considered

- Direct browser inserts into `events`: rejected because route-backed auth, validation, and slug handling are stricter and easier to smoke test.
- Building the whole club event management suite at once: rejected because this slice only needs creation plus basic visibility and should stay narrowly scoped.
- Deferring audit logging to a later refactor: rejected because event creation is a core organizer write path and should be traceable from the start.
- Shipping route rendering without create-flow smoke: rejected because the user explicitly wants stronger RLS and operational confidence for write workflows.

## Edge Cases

- Club route must stay useful even when no events exist yet; empty-state language should clarify that the organizer can create the first one.
- Users with multiple active clubs must choose the target club explicitly before creating an event.
- `join_deadline_at` must never be after `start_at`, and `end_at` must always be after `start_at`.
- Repeated create attempts with the same name should not explode on slug collisions; the backend should generate a stable unique slug.
- Concurrent create smoke must clean up its own fixtures so later admin smoke scripts keep seeing the seeded visibility order.
- Optional fields like `cover_image_url`, `max_participants`, and `rules` may be blank and should normalize cleanly.
- Bounded latest lists must not silently imply full coverage; UI should state the visible limit.
- Club and event metadata should normalize into compact summary strings instead of leaking raw null-heavy rows.
- The route should stay compact on mobile and desktop; creation and recent-event rows should wrap instead of overflowing.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
- Run auth-backed smoke checks for:
  1. seeded organizer can open `/club/events`
  2. seeded student is redirected away from that route
  3. student or unrelated session cannot create events
  4. organizer create action succeeds once and route validation catches malformed bodies
  5. created event appears in organizer route output and organizer-auth event reads
  6. concurrent organizer submissions still succeed with unique slugs and do not pollute later smoke runs
- Open the local web preview and verify:
  1. `/club`
  2. `/club/events`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
