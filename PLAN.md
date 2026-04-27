# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-push-registration`
- **Goal:** Add the first real student device-notification registration flow in the mobile profile screen.

## Architectural Decisions

- Keep this slice centered on the existing profile tab. We already have native token preparation; the missing step is authenticated backend enrollment plus clear UX around unsupported environments.
- Split responsibilities cleanly:
  1. `lib/push.ts` stays responsible for native permission + Expo token preparation
  2. a new `features/push` module owns backend registration and result shaping
  3. `student/profile` becomes the user-facing orchestration surface
- Keep the first UI scope tight:
  1. explain physical-device and development-build requirements
  2. request permission and get the Expo token
  3. post the token to `register-device-token`
  4. show device state, Expo token state, and backend registration state
- Do not add notification listeners, deep-link handling, or backend test-send UI in this slice. The smallest correct step is device enrollment.

## Alternatives Considered

- Auto-registering the push token during session bootstrap: rejected because permission prompts and native failures should stay behind an explicit user action in this slice.
- Adding a stable per-device ID dependency now: rejected because backend registration already allows `deviceId: null`, and we should keep this change small unless rotation cleanup becomes a product requirement on mobile.
- Adding a server-triggered test-push button for students: rejected because the current Phase 3 need is enrollment, not diagnostic delivery.

## Edge Cases

- The app runs on web, where remote push enrollment is unavailable.
- The app runs in Expo Go or a simulator, where a real remote push token is unavailable.
- Permission is denied after the request prompt.
- Permission is granted but backend token registration fails, so the student should see a partial failure instead of fake success.
- `EXPO_PUBLIC_EAS_PROJECT_ID` is missing, so native token preparation is misconfigured.

## Validation Plan

- Reset local Supabase with the current migrations and seed data.
- Run `npm run lint` in `apps/mobile`.
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run export:web` in `apps/mobile`.
- Run local Supabase-authenticated smoke checks for:
  1. backend `register-device-token` success path with the seeded student session
  2. invalid bearer token rejection for the same endpoint
  3. profile route render with the new notification registration surface
- Start the local web preview and verify `/student/profile` renders the updated push-registration UI.
