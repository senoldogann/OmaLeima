# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/business-event-slider-popup-polish`
- **Goal:** Make scanner accounts land on a camera-first business scanning experience while preserving venue/device safety.

## Architectural Decisions

- Keep scanner-only auto-redirect on business home; this branch only refines the scanner route.
- Keep `scanQrWithTimeoutAsync`, scanner device registration, PIN checks, and duplicate behavior unchanged.
- Put the camera before auxiliary event/device details so the scanner account behaves like a desk kiosk.
- Collapse selected venue and readiness into a compact status row below the camera.
- Keep multi-event selection visible only when there is more than one active joined event.

## Edge Cases

- No active joined event: keep the existing empty state instead of opening a blank camera.
- Camera permission missing: show the permission action in the camera slot.
- Scanner device registering/error: show a short inline state and retry button only when needed.
- PIN-required device: show the PIN input before the camera because scanning cannot succeed without it.
- Scan locked after result: keep the locked camera overlay and explicit `Scan again` action.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
