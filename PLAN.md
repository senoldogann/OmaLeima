# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-qr-screen`
- **Goal:** Add the first real student QR screen with secure refresh behavior and capture protection.

## Architectural Decisions

- Keep the slice narrow around one tab:
  1. resolve the student's most relevant registered event
  2. request QR payloads from `generate-qr-token`
  3. refresh only while the app is foregrounded
  4. show countdown, progress, and warning state on one screen
- Treat the backend response as the source of timing truth. The client will use `refreshAfterSeconds` from `generate-qr-token` instead of hard-coding a 10-second or 30-second refresh interval.
- Prefer a pure JavaScript QR rendering path that works on native and web without introducing extra signing or encoding logic into the backend.
- Use Expo's screen-capture prevention hook on the QR screen while it is mounted. Do not add screenshot-listener permissions in this slice because the product need is prevention plus visible warning, not screenshot event analytics.
- Reuse current Phase 3 event data where possible:
  1. registered active event first
  2. otherwise nearest upcoming registered event as standby context
  3. show progress against `minimum_stamps_required`

## Alternatives Considered

- Hard-coding the QR timer on the client: rejected because the backend already publishes refresh cadence and that is the stable contract we actually own.
- Rendering QR via a remote web service: rejected because the QR token is sensitive and must stay inside the app boundary.
- Adding screenshot callback permissions on Android now: rejected because it increases permission surface without improving the core Phase 3 user flow.

## Edge Cases

- The student has no registered event at all.
- The student has a registered upcoming event but no currently active event.
- `generate-qr-token` fails with `EVENT_FULL`, `EVENT_REGISTRATION_CLOSED`, or a transient network error.
- The app moves to background mid-refresh and returns to foreground later.
- The seeded event is active, but future fixture events also exist after local smoke setup.

## Validation Plan

- Install any mobile dependencies needed for QR rendering or screen-capture prevention through project package files.
- Run `npm run lint` in `apps/mobile`.
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run export:web` in `apps/mobile`.
- Run local Supabase-authenticated smoke checks for:
  1. seeded active registered event QR success
  2. upcoming registered event standby selection
  3. closed/full QR fetch rejection still surfaces an actionable state
- Start the local web preview and verify the QR tab route renders cleanly after the live token and standby states are wired.
