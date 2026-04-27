# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-expo-foundation`
- **Scope:** Phase 3 mobile Expo foundation for the student app.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/.env.example`
- `apps/mobile/README.md`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/eslint.config.js`
- `apps/mobile/assets/images/*`
- `apps/mobile/src/app/*`
- `apps/mobile/src/components/*`
- `apps/mobile/src/features/*`
- `apps/mobile/src/lib/*`
- `apps/mobile/src/providers/*`
- `apps/mobile/src/types/*`
- `PROGRESS.md`

## Risks

- The repo had no mobile package yet, so the first app scaffold can easily drift away from the master plan route structure if we keep too much template code.
- Expo push permissions must be prepared with the current `expo-notifications` plugin and project ID flow, but real push testing still requires a development build on a physical device.
- Supabase client setup must be strict about missing public env vars; otherwise the foundation will fail later in confusing ways during auth work.
- The first mobile slice should not leak backend secrets or move QR logic client-side.
- Google auth is the next slice, so this branch should stop at session bootstrap, route shell, and push preparation instead of inventing partial auth behavior.

## Dependencies

- `LEIMA_APP_MASTER_PLAN.md` sections for `apps/mobile`, student tab structure, Supabase auth, and push token registration flow.
- Current official Expo SDK 55 project structure, router, and notifications setup guidance.
- Current official Supabase Expo React Native quickstart for client initialization and session persistence.
- Existing Supabase backend endpoints already merged in Phase 2.

## Existing Logic Checked

- The repository currently contains only backend, schema, and planning work; there is no pre-existing Expo app or shared frontend package to extend.
- The new Expo default template already uses `src/app` and Expo Router, which matches the master plan direction.
- `register-device-token` is already available on the backend, so the mobile app only needs permission and token preparation in this slice.
- Supabase auth and event queries are not wired on the client yet.

## Review Outcome

Implement a production-shaped mobile foundation in `apps/mobile`: keep the Expo Router scaffold, replace the demo UI with OmaLeima route shells, add strict public env parsing, create the shared Supabase client and auth session provider, prepare React Query, and add push permission/token helpers without crossing into full Google login or QR feature work.
