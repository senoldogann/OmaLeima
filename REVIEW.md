# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-01
- **Branch:** `feature/push-diagnostics-polish`
- **Scope:** Finish the post-QA business/mobile polish slice: keep support/login inputs visible above the keyboard, fix the admin/organizer web login bounce, simplify business home, add safer back navigation, center student preference modals, add full-stack editable business profile details for cover/logo/event-day metadata, and make scanner accounts see that venue context during scans.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `supabase/migrations/20260501093000_business_profile_details.sql`
- `apps/admin/src/app/auth/password-session/route.ts`
- `apps/admin/src/features/auth/access.ts`
- `apps/admin/src/features/auth/components/admin-login-panel.tsx`
- `apps/admin/src/lib/supabase/proxy.ts`
- `apps/mobile/src/app/auth/login.tsx`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/history.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/app/business/scanner.tsx`
- `apps/mobile/src/app/student/profile.tsx`
- `apps/mobile/src/features/business/business-home.ts`
- `apps/mobile/src/features/business/business-profile.ts`
- `apps/mobile/src/features/business/types.ts`
- `apps/mobile/src/features/support/components/support-request-sheet.tsx`

## Risks

- Admin web auth proxy must not throw on anonymous users, but it still must fail loudly on real unexpected Supabase auth refresh errors.
- Password login must persist the Supabase session into SSR cookies before redirecting; otherwise admin/organizer accounts can appear signed in briefly and then land back on `/login`.
- Business profile update permissions must be stricter than the previous broad `business_staff` policy; scanner accounts should not edit official venue data.
- Adding new business columns requires remote Supabase migration before the mobile app queries `cover_image_url`, `y_tunnus`, `opening_hours`, and `announcement`.
- Mobile profile and support forms contain many inputs; keyboard behavior must stay usable on physical iPhone without hiding focused fields.
- Business scanner should show dynamic logo/cover context without blocking the core scan path if image URLs are missing.

## Dependencies

- Existing `business_staff` roles remain the authority for OWNER/MANAGER/SCANNER permissions.
- `useBusinessHomeOverviewQuery` remains the shared source for business profile, home, events, scanner, and support context.
- `CoverImageSurface` already handles remote image caching and fallback rendering.
- Existing Supabase RLS helpers such as `is_platform_admin()` are reused for the new manager-only profile policy.
- Mobile/admin validation commands remain the merge gate.

## Existing Logic Checked

- `businesses` already had `phone`, `website_url`, `instagram_url`, and `logo_url`; it lacked cover image, Y-tunnus, responsible person, opening hours, and announcement fields.
- The old `business staff can update own business` RLS policy allowed all active staff roles to update business rows; the new profile editor needs manager/owner-only writes.
- `AdminLoginPanel` was doing a client route replace immediately after password sign-in, which can race the SSR cookie handoff; the fix needs a route handler that calls `setSession()` server-side.
- `proxy.ts` used `getClaims()` and threw on missing anonymous sessions, which can break public `/login` render paths.
- `SupportRequestSheet` already uses keyboard insets, but it did not scroll to the focused input reliably.

## Review Outcome

Do a focused full-stack polish pass:

- add manager-owned business profile fields and RLS
- apply the migration to hosted Supabase
- expose the new fields in business overview data
- rebuild business profile around editable company details and media URLs
- show dynamic business cover/logo/announcement in the scanner context
- simplify business home and fix small scanner/history label issues
- fix admin password login handoff with a server-side password session route and anonymous proxy behavior
- show venue address, phone, and opening hours to scanner accounts during event-day scanning
- make support/business login inputs safer around the keyboard
- rerun mobile/admin validation gates and record the handoff
