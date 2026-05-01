# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-01
- **Branch:** `bug/admin-password-session-cookies`
- **Goal:** Stop admin and organizer password logins from bouncing back to `/login` by ensuring Supabase session cookies are returned by the password-session route itself.

## Architectural Decisions

- Keep the existing client password form and `/auth/password-session` handoff.
- Build a dedicated route-handler Supabase client in `password-session/route.ts` so cookie collection is visible in that route.
- Mutate `request.cookies` inside `setAll()` before resolving access so the same request can immediately read the new session.
- Attach every collected cookie to the final `NextResponse.json()` response.
- Leave role mapping and dashboard redirects unchanged.

## Alternatives Considered

- Redirect directly from the password-session route:
  - rejected because the current client flow expects a JSON `{ homeHref }` response and already controls navigation
- Store admin access in local storage:
  - rejected because the admin app is SSR-protected and must use HTTP cookies
- Bypass `resolveAdminAccessAsync` after password login:
  - rejected because role routing must stay centralized and consistent with OAuth callback behavior

## Edge Cases

- Invalid token payload returns an explicit 400 or 401 without setting cookies.
- Session set succeeds but role lookup returns unsupported: browser receives `/forbidden`, not `/login`.
- Admin and organizer accounts should persist through the first protected SSR navigation after login.
- Anonymous `/login` render should still work normally.

## Validation Plan

- Run:
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run build`
- Record the handoff in `PROGRESS.md`.
- After deploy, run browser smoke or manually test admin and organizer credentials against the deployed URL.
