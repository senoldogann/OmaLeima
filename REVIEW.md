# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-01
- **Branch:** `bug/admin-password-session-cookies`
- **Scope:** Fix the admin/organizer password login bounce where the browser briefly reaches the protected dashboard and then returns to `/login`.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/src/app/auth/password-session/route.ts`

## Risks

- Password sign-in must persist Supabase SSR cookies on the same response returned to the browser.
- The fix must not loosen role checks; admin should still land on `/admin`, organizer on `/club`, unsupported users on `/forbidden`.
- Route-handler cookies must be set explicitly on the returned `NextResponse`; relying on a helper that writes to a different response can look successful but leave the next navigation anonymous.
- Hosted smoke needs a deployed admin app to prove the fix end to end.

## Dependencies

- `AdminLoginPanel` still signs in with Supabase client auth and sends access/refresh tokens to `/auth/password-session`.
- `resolveAdminAccessAsync` remains the single role router after the session is set.
- `publicEnv` supplies the same hosted Supabase URL and publishable key used by other admin Supabase clients.

## Existing Logic Checked

- The previous password-session route called `supabase.auth.setSession()` through `createRouteHandlerClient()`, then returned a fresh `NextResponse.json()`.
- That can drop the Set-Cookie headers because the cookies are not attached to the final JSON response object.
- Protected admin and club layouts redirect anonymous access to `/login`, which matches the user's “login succeeds, then returns to login” symptom.

## Review Outcome

Create the Supabase route-handler client inside `/auth/password-session`, collect cookies from `setSession()`, mutate the request cookie jar for the immediate access lookup, and attach the same cookies to the final JSON response before returning it.
