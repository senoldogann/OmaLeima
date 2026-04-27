# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-google-auth`
- **Goal:** Connect the login screen to Supabase Google OAuth and add the first real auth guard for student routes.

## Architectural Decisions

- Keep the Phase 3 scope narrow: this branch will only solve sign-in, callback completion, sign-out, and route protection.
- Use Supabase OAuth for Google instead of a provider-specific native SDK so the auth surface stays aligned with the backend and can later support other providers.
- Complete the mobile OAuth flow with PKCE:
  1. build redirect URI from Expo config
  2. request OAuth URL from Supabase with `skipBrowserRedirect`
  3. open the auth session on native with `expo-web-browser`
  4. redirect same-window on web
  5. exchange the returned auth code in an `auth/callback` route
- Add `expo-web-browser` plugin configuration in `app.config.ts` to match Expo's current auth guidance.
- Protect `student/*` routes in the tab layout and redirect anonymous users back to login.
- Redirect authenticated users away from `auth/login` and expose a simple sign-out action from the student profile screen.

## Alternatives Considered

- Pulling in a provider-specific Google sign-in SDK now: rejected because Supabase OAuth already covers the product need and keeps session handling inside one auth model.
- Mixing event fetching into the auth branch: rejected because it would blur whether failures come from OAuth setup or data/RLS setup.
- Leaving auth completion in button-local code only: rejected because web redirects and cold app launches need a route-based callback surface.

## Edge Cases

- Public Supabase env vars are missing.
- Google OAuth is tapped on web without the provider being configured in Supabase.
- OAuth callback returns `error` or arrives without a `code`.
- Session bootstrap is loading while the router decides between login and student tabs.
- Native auth is started on simulator or Expo Go without full provider setup.

## Validation Plan

- Install any auth-specific Expo/mobile dependencies if needed.
- Run `npm run lint` in `apps/mobile`.
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run export:web` in `apps/mobile`.
- Start the local web preview and verify the login screen, callback route, and authenticated route guard render cleanly.
