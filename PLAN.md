# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-platform-oversight`
- **Goal:** Add the next real system-admin workflow: platform-wide oversight for clubs, events, fraud signals, and audit logs.

## Architectural Decisions

- Keep oversight reads on the server with the existing SSR Supabase client. This route is read-only, so there is no reason to pay client bundle cost for live query logic.
- Extend the existing admin shell instead of creating a second layout pattern. The new route should feel like a direct part of `/admin`.
- Use a compact read model with summary cards plus bounded lists:
  1. active clubs
  2. upcoming or currently active non-finished events
  3. latest audit logs
  4. latest open fraud signals
- Keep list limits explicit in UI copy so operators can see when a panel is showing “latest N” rather than the entire dataset.
- For smoke, seed deterministic `audit_logs` and `fraud_signals` fixtures directly into the local DB. Do not add production write paths just to manufacture test data.
- Validation for this slice must include:
  1. route-level access checks for `/admin/oversight`
  2. RLS smoke proving non-admin sessions cannot read `audit_logs`
  3. RLS smoke proving organizer sessions can still read event-scoped `fraud_signals`
  4. admin oversight route renders seeded club, event, fraud, and audit data while excluding reviewed fraud and already-ended event fixtures
  5. standard `lint`, `typecheck`, and `build`
- CI, higher-volume load work, and GTM rollout details should be documented more explicitly after this slice, but not expanded into unrelated implementation work here.

## Alternatives Considered

- Building a generic admin reporting framework first: rejected because this slice only needs one concrete oversight screen and should stay narrowly scoped.
- Making the page client-driven with parallel browser fetches: rejected because server reads are simpler, cheaper, and safer under the current app structure.
- Adding moderation actions to fraud or audit panels now: rejected because this slice is visibility-first and should not expand into mutation workflows yet.
- Shipping route rendering without data-level smoke: rejected because the user explicitly wants stronger RLS and operational confidence for admin workflows.

## Edge Cases

- Admin route must stay useful even when some panels are empty; empty-state language should clarify that the system is currently quiet rather than broken.
- Organizer or student sessions must not read `audit_logs`, and organizer route access must still redirect away from `/admin/oversight`.
- The operational event list must not let recently ended events crowd out future ones; bounded panels should prefer work that still needs action.
- Fraud signals may reference event, student, business, or scanner data partially; missing related fields must not break card layout.
- The fraud summary and fraud list must describe the same operational universe so counts and visible records do not contradict each other.
- Bounded latest lists must not silently imply full coverage; UI should state the visible limit.
- Audit metadata and fraud metadata are JSON and may be sparse; the read model should normalize them into safe summary strings instead of dumping raw payload blobs.
- The route should stay compact on mobile and desktop; operational rows should wrap instead of overflowing.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
- Run auth-backed smoke checks for:
  1. seeded platform admin can open `/admin/oversight`
  2. seeded organizer is redirected away from that route
  3. non-admin RLS query cannot see `audit_logs`
  4. organizer can read an event-scoped fraud signal for a managed event
  5. admin oversight route shows seeded fraud and audit fixtures
  6. admin oversight route shows club and event records from the seeded base data and excludes reviewed-fraud or ended-event fixtures
- Open the local web preview and verify:
  1. `/admin`
  2. `/admin/oversight`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
