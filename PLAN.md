# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-reward-tier-management`
- **Goal:** Add the next real club organizer workflow: manage reward tiers from the web panel.

## Architectural Decisions

- Keep reward-tier reads on the server with the existing SSR Supabase client, then hand only serializable event and tier records into a small client component for form state.
- Extend the existing club shell instead of creating a second layout pattern. The new route should feel like a direct part of `/club`.
- Use a compact read model with summary cards plus bounded lists:
  1. manageable club events
  2. active and disabled reward tiers for those events
  3. stock pressure and claim visibility
- Keep list limits explicit in UI copy so operators can see when a panel is showing “latest N” rather than the entire dataset.
- Back reward-tier create and update with DB-owned safe write paths, then call them from club route handlers. This keeps auth on the server, gives stable inventory checks under concurrent claims, and lets audit logging stay in the same transaction boundary.
- For smoke, create deterministic reward-tier fixtures through the real route where possible and seed only the minimum claimed-stock fixture needed to prove inventory boundaries. Do not add production-only test hooks.
- Validation for this slice must include:
  1. route-level access checks for `/club/rewards`
  2. organizer create flow succeeds for an owned event and the new tier becomes visible immediately
  3. organizer update flow succeeds for title, thresholds, instructions, inventory, and disabled state
  4. invalid payloads fail early at the route boundary
  5. student or non-organizer sessions cannot create or edit reward tiers through the route or direct table writes
  6. inventory updates reject totals lower than already claimed stock
  7. standard `lint`, `typecheck`, and `build`
- CI, higher-volume load work, and GTM rollout details should be documented more explicitly after this slice, but not expanded into unrelated implementation work here.

## Alternatives Considered

- Direct browser inserts or updates on `reward_tiers`: rejected because route-backed auth, inventory validation, and audit logging are stricter and easier to smoke test.
- Building reward claims confirmation in the same slice: rejected because this slice only needs organizer catalog management plus stock visibility and should stay narrowly scoped.
- Reusing raw table updates without an explicit ownership boundary: rejected because current RLS is broader than this slice wants and would leave a staff bypass.
- Shipping route rendering without claimed-stock smoke: rejected because the user explicitly wants stronger RLS and operational confidence for write workflows.

## Edge Cases

- Club route must stay useful even when an organizer has no reward tiers yet; empty-state language should clarify that they can publish the first reward for a selected event.
- Users with multiple active club events must choose the target event explicitly before creating a tier.
- `required_stamp_count` must stay positive and should not create confusing duplicate thresholds without clear UI feedback.
- `inventory_total` may be unlimited, but when present it must never fall below `inventory_claimed`.
- Claimed-stock smoke fixtures must clean up both `reward_claims` and `audit_logs` so later admin smoke scripts keep seeing the seeded visibility order.
- Optional fields like `description` and `claim_instructions` may be blank and should normalize cleanly.
- Bounded latest lists must not silently imply full coverage; UI should state the visible limit.
- Event and tier metadata should normalize into compact summary strings instead of leaking raw null-heavy rows.
- The route should stay compact on mobile and desktop; create and edit rows should wrap instead of overflowing.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
  4. keep local admin app available at `http://localhost:3001`
  5. keep local Edge Functions runtime available with `supabase functions serve --env-file supabase/.env.local`
- Run auth-backed smoke checks for:
  1. seeded organizer can open `/club/rewards`
  2. seeded student is redirected away from that route
  3. student and staff direct writes cannot mutate `reward_tiers`
  4. organizer create and update actions succeed once and route validation catches malformed bodies
  5. created or updated tiers appear in organizer route output and organizer-auth reads
  6. claimed-stock fixture proves low inventory updates are rejected and smoke cleanup keeps later admin scripts stable
- Open the local web preview and verify:
  1. `/club`
  2. `/club/rewards`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.

## Outcome

The implemented slice follows the planned route-backed pattern. Reward-tier writes now stay inside DB-owned transaction boundaries, direct staff bypass is closed at the RLS layer, and the admin smoke set includes repeatable cleanup for both reward-tier and business-application fixtures so reruns stay stable.
