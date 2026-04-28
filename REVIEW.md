# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-business-auth-and-home`
- **Scope:** Phase 4 mobile business-staff email/password sign-in plus the first business home route.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/app/auth/*`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/business/*`
- `apps/mobile/src/features/auth/*`
- `apps/mobile/src/features/business/*`

## Risks

- The app currently assumes every authenticated user should land in the student area, so role-aware redirect logic must be fixed before business auth can feel correct.
- Email/password sign-in must reject accounts that do not have at least one active readable business membership, otherwise suspended business access could slip into the wrong route.
- Business home data spans `business_staff`, `businesses`, `event_venues`, and `events`, so the read model needs to avoid ad hoc per-row lookups.
- Multi-business staff accounts can join different events per location, so city opportunities must stay business-specific instead of collapsing everything at the event level.
- Join/leave mutations do not exist yet for business staff, so the first home route must stay honest about what is live now versus what lands next.
- Student and business areas will now share one auth entry screen, so the UI must keep the two modes obvious instead of blending them into one confusing form.

## Dependencies

- Existing mobile auth bootstrap, route guards, and Google student login.
- Existing database foundation for `business_staff`, `businesses`, `event_venues`, and `events`.
- Local seeded scanner/business staff account for email/password smoke validation.

## Existing Logic Checked

- `auth/login`, `auth/_layout`, `auth/callback`, `index`, and `student/_layout` still hardcode student redirects.
- There is no `business` route tree yet inside the mobile app.
- Supabase auth is already wired for Google OAuth and persisted sessions, so password auth can reuse the same session bootstrap.
- Database RLS already allows a user to read their own `business_staff` memberships and businesses can read joined event venue rows relevant to them.

## Review Outcome

Add a small shared auth-access read model that only routes through active readable businesses, extend the login screen with a business email/password mode, introduce the first `business/home` route with joined-event and per-business city-opportunity sections, and update route guards so authenticated users land in the correct area automatically.
