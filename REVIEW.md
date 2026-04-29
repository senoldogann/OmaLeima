# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `bug/native-google-auth-redirect`
- **Scope:** Fix the native Google OAuth redirect used by the Expo development build so physical-device sign-in stops opening an unreachable localhost callback.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/src/lib/auth.ts`
- `apps/mobile/README.md`

## Risks

- The current native redirect helper may still generate a dev-server localhost callback inside the iOS development build, which breaks Google OAuth on a physical device.
- We should not change the web callback behavior while fixing native auth. Web and hosted login still need the existing callback path behavior.
- The user already installed a development build, so the redirect fix should stay in JavaScript where possible and avoid forcing another iOS build for this specific sign-in retest.

## Dependencies

- Existing mobile Google OAuth flow in `apps/mobile/src/lib/auth.ts` and callback handling in `apps/mobile/src/app/auth/callback.tsx`
- Expo AuthSession redirect behavior for development builds
- Supabase mobile deep-link redirect guidance for Expo React Native

## Existing Logic Checked

- Native redirect URI is generated in `apps/mobile/src/lib/auth.ts` with `makeRedirectUri`
- OAuth callback exchange still happens in `apps/mobile/src/app/auth/callback.tsx`
- Login screen already surfaces the computed redirect URI, which makes this bug visible without extra debug UI

## Review Outcome

Ship a small auth hotfix that:

- forces the native mobile OAuth redirect to the explicit app scheme `omaleima://auth/callback`
- keeps web callback behavior unchanged
- preserves the existing callback route and session exchange path
- records the new device-side Google sign-in blocker and resolution in the handoff docs
