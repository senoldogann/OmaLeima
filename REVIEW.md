# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-google-auth`
- **Scope:** Phase 3 Google sign-in and the first authenticated route guard for the student app.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/.env.example`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/auth/*`
- `apps/mobile/src/app/student/*`
- `apps/mobile/src/components/*`
- `apps/mobile/src/features/auth/*`
- `apps/mobile/src/lib/*`
- `apps/mobile/src/providers/*`
- `apps/mobile/src/types/*`
- `PROGRESS.md`

## Risks

- Google OAuth in Expo is sensitive to redirect URI shape, app scheme configuration, and Supabase redirect allow-lists.
- The flow must work without silently depending on browser-only behavior, because the product target is mobile first.
- We can validate the client flow and callback handling locally, but an end-to-end Google sign-in still depends on external provider configuration in Supabase and Google Cloud.
- Web preview should keep working even if Google OAuth is not fully configured in the local environment.
- Route protection should not create redirect loops while session bootstrap is still loading.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for Google login, protected student navigation, and mobile auth flow.
- Current official Supabase guidance for Expo social auth and Google social login.
- Current official Expo guidance for browser-based OAuth, redirect URI handling, and `expo-web-browser`.
- Existing `apps/mobile` foundation branch already merged to `main`.

## Existing Logic Checked

- `apps/mobile` already has strict env parsing, Supabase client bootstrap, React Query provider, and route shell tabs.
- `@supabase/auth-js` in local `node_modules` confirms `skipBrowserRedirect` is available and that `exchangeCodeForSession` is the correct PKCE completion API.
- Login screen currently has no real sign-in action and student tabs are not yet protected from anonymous access.
- `expo-web-browser` is installed already, but the plugin configuration for auth launcher behavior is not set yet.

## Review Outcome

Implement the first real auth slice in `apps/mobile`: add a Google sign-in action backed by `supabase.auth.signInWithOAuth`, introduce an OAuth callback route that exchanges the PKCE code for a session, protect the student tab layout from anonymous access, and add a sign-out path so the route guard can be validated end to end once provider configuration is ready.
