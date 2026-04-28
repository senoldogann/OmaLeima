# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-business-auth-and-home`
- **Goal:** Start Phase 4 with business-staff email/password auth and the first business home route.

## Architectural Decisions

- Keep one shared auth entry screen, but make the mode explicit:
  1. student mode keeps Google OAuth
  2. business mode uses email/password
- Add a lightweight shared access read model under `features/auth`:
  1. resolve the authenticated user’s profile role
  2. detect only active business staff memberships that still map to readable active businesses
  3. compute the correct app home route
- Use that shared access model in:
  1. `/`
  2. `auth/_layout`
  3. `auth/login`
  4. `auth/callback`
  5. `student/_layout`
  6. new `business/_layout`
- Keep the first business home scope read-only and useful:
  1. show active business memberships
  2. show joined live/upcoming events
  3. show public upcoming city opportunities per business location for future join flow
  4. keep scanner and join actions clearly marked as the next slice
- Do not add scanner camera or join/leave writes in this branch. The smallest correct Phase 4 step is access plus the first home context.

## Alternatives Considered

- Creating a completely separate business login route: rejected because one shared auth entry is simpler for MVP and keeps redirect logic centralized.
- Redirecting authenticated users purely from `profiles.primary_role`: rejected because business access is really tied to active `business_staff` membership.
- Implementing business join/leave mutations now: rejected because the backend write path is not part of this smallest Phase 4 slice.
- Reusing student tabs for business screens: rejected because the business workflow has different navigation and should start under its own route group.

## Edge Cases

- Authenticated business user opens `/student/*`.
- Authenticated student opens `/business/*`.
- Email/password sign-in succeeds but the account has no active business staff membership.
- Business user belongs to multiple businesses.
- Business has no joined events yet.
- Business city has public upcoming events, but join action is not live in this slice.
- Session restore finishes before access resolution finishes, so redirect timing must stay stable.

## Validation Plan

- Run `apps/mobile` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run export:web`
- Reset local Supabase and run auth-backed smoke checks for:
  1. business email/password sign-in with the seeded scanner account
  2. route access resolution for student and business accounts
  3. business joined-event query shape
  4. business city-opportunity query shape
- Open the local web preview and verify:
  1. `/auth/login`
  2. `/business/home`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
