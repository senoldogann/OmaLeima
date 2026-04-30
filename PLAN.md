# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-01
- **Branch:** `feature/push-diagnostics-polish`
- **Goal:** Finish the business/mobile stability slice: keyboard-safe support/login inputs, repaired admin/organizer web login, cleaner business navigation, and a real editable business profile surface with cover/logo and Finnish company details that scanner accounts can see during event-day scans.

## Architectural Decisions

- Keep business profile data on `public.businesses`; add only the missing fields rather than creating a separate profile table.
- Restrict business profile writes to platform admins plus OWNER/MANAGER staff through a new `is_business_manager_for()` RLS helper.
- Continue using `useBusinessHomeOverviewQuery` as the shared mobile business context so home, profile, events, scanner, and support stay consistent.
- Store cover and logo as URL fields for now; a later storage upload flow can write URLs into the same columns without changing scanner/profile rendering.
- Show dynamic cover/logo/announcement/address/phone/opening-hours in scanner as context only; scanning remains driven by `event_venues` and the atomic scanner RPC.
- Fix admin login by letting anonymous proxy refresh pass through and by persisting password sessions through a route handler before redirecting so SSR cookies are present.

## Alternatives Considered

- Create a separate `business_profiles` table:
  - rejected because current business identity already lives in `businesses`, and splitting would add joins without solving a current problem
- Let SCANNER role edit business profile fields:
  - rejected because event-day scanner accounts should not be able to change legal/contact/media metadata
- Add image upload storage in the same slice:
  - rejected because URL-backed media unblocks dynamic UI safely; storage UI and moderation can be a later owner/admin feature
- Keep business home sign-out as a large button:
  - rejected because the user asked for a smaller icon action next to profile and less clutter on the home surface

## Edge Cases

- Missing cover/logo URLs must render a stable fallback, not break the scanner or profile.
- Scanner accounts can read profile data but cannot save edits.
- Multiple business memberships must be selectable without losing the edited draft for the active selected business.
- Admin `/login` must render without a session and protected routes must still enforce role checks after login.
- Password login must redirect based on resolved admin access after the server has written auth cookies.
- Support sheet subject/message fields must remain visible when the keyboard opens from student or business profile.
- Validation must ignore the known untracked `.idea/` folder and not try to clean it up.

## Validation Plan

- Update working docs for the expanded business/admin scope.
- Add and push the Supabase migration for business profile details.
- Update business overview types/query mapping and profile update mutation.
- Rebuild business profile UI and scanner context UI around dynamic business metadata.
- Simplify business home and add back buttons to business subroutes.
- Fix admin login handoff with a password-session route and anonymous proxy behavior.
- Extend scanner context with business address, phone, and opening hours.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run build`
- Document the exact outcome in `PROGRESS.md`.
