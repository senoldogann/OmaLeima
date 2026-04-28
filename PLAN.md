# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-web-foundation`
- **Goal:** Start Phase 5 with a real Next.js admin and club panel foundation, plus role-gated Supabase SSR auth.

## Architectural Decisions

- Create a new standalone `apps/admin` Next.js App Router app instead of folding web admin into the Expo app or repo root.
- Use Supabase SSR auth utilities with cookie-based session refresh:
  1. browser client for login actions
  2. server client for route protection and data reads
  3. `proxy.ts` to refresh auth cookies via `getClaims()`
- Keep the first protected surfaces small but real:
  1. `/login`
  2. `/admin`
  3. `/club`
- Route access should be driven by server-validated `profiles.primary_role` and `profiles.status`, not by client-side assumptions.
- This slice should end with a utilitarian dashboard shell, not a marketing page.
- Testing and launch readiness must stay visible in planning:
  1. auth-backed smoke scripts stay mandatory for each branch
  2. stronger RLS, concurrency, CI, and load-test work remains Phase 6 scope
  3. go-to-market and deployment packaging should be documented as explicit follow-up work, not left implicit

## Alternatives Considered

- Building admin inside the mobile repo root without a dedicated app folder: rejected because web admin needs its own runtime, scripts, and deployment path.
- Starting with static mock dashboards only: rejected because this phase should already prove the real auth gate and role routing.
- Trusting `getSession()` in server code: rejected because official Supabase guidance for protected server surfaces is `getClaims()`.
- Delaying all docs until after multiple admin modules land: rejected because Phase 5 introduces a second app surface and needs explicit run/env guidance immediately.

## Edge Cases

- Authenticated user has an active session but `profiles.status` is not `ACTIVE`.
- Student or business staff session hits the admin app and must not see admin or club routes.
- Platform admin and club organizer need different landing routes from the same root path.
- OAuth callback must not strand users on a dead end if role resolution says `unsupported`.
- Proxy matcher must avoid static asset noise while still covering protected routes.
- The app foundation must stay easy to extend later with CI smoke checks, RLS probes, and load-test harnesses.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run build`
- Run auth-backed smoke checks for:
  1. seeded platform admin resolves to admin area
  2. seeded club organizer resolves to club area
  3. seeded student resolves to unsupported area
  4. protected route logic rejects unsupported roles
- Open the local web preview and verify:
  1. `/login`
  2. `/admin`
  3. `/club`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
