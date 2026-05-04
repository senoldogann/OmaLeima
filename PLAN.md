# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `bug/scanner-duplicate-and-kiosk-home`
- **Goal:** Make business scanner accounts land in a simple camera-first flow and make duplicate leima outcomes clear on real devices.

## Architectural Decisions

- Preserve the atomic `scan_stamp_atomic` duplicate guard. A second scan for the same event/business/student remains non-mutating.
- Return existing valid stamp context for `ALREADY_STAMPED` so the client can show an operational "already recorded" state instead of a vague error.
- Treat `ALREADY_STAMPED` as a calm warning/success-adjacent result in scanner UI.
- In business home, auto-route scanner-only users to `/business/scanner` when a live joined event exists.
- In scanner route, prioritize event selector, device/PIN state, camera and result. Hide business profile/location proof/long event-day explanatory panels from the event-day surface.

## Edge Cases

- No active joined event: show a short standby message and route managers to event management, but scanner-only users should not see fake camera state.
- Multiple active joined events: keep a compact selector before the camera.
- PIN-required scanner devices: PIN input must stay visible before scanning and not be buried under nonessential panels.
- Duplicate scan: no second stamp is created; staff sees that the leima was already recorded and can continue scanning.
- Location proof remains optional and can be reintroduced later in a compact QA/security drawer.

## Validation Plan

- Run:
  - `npx supabase@2.95.4 db lint --linked`
  - `npx supabase@2.95.4 functions deploy scan-qr`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
