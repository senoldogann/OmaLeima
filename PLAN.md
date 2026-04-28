# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-business-scan-history-and-leave-flow`
- **Goal:** Finish the next Phase 4 business slice with leave-before-start and a dedicated scan history screen.

## Architectural Decisions

- Keep the business mobile data surface centered on one shared read model, but add the missing write primitive:
  1. `leave_business_event_atomic`
  2. no scan-history write table because `stamps` already is the source of truth
- Build one dedicated history route instead of burying history at the bottom of the scanner screen:
  1. `business/history` shows recent own scans
  2. scanner route can deep-link into history after results
- Leave flow belongs on joined upcoming events only:
  1. never for active events
  2. never for completed or cancelled events
  3. never after `start_at`
- Scanner result states should become more explicit and product-shaped:
  1. success green
  2. duplicate/already-stamped yellow
  3. expired orange
  4. invalid or venue mismatch red
  5. inactive event neutral/red
- Scanner lock stays manual, but this slice should make that lock obvious and stable across camera, manual fallback, timeout, and result actions.

## Alternatives Considered

- Adding leave flow through direct `event_venues` updates: rejected because the business mobile app should stay behind RPC guardrails.
- Keeping scan history on the scanner screen only: rejected because the roadmap explicitly expects a past-scan list as its own business-facing surface.
- Using `qr_token_uses` for history: rejected because the real operator history should reflect successful stamp outcomes from `stamps`, not every transport attempt.
- Adding automatic scanner unlock right after result: rejected because the event-day flow already chose explicit operator acknowledgement to reduce accidental rapid rescans.

## Edge Cases

- Business staff tries to leave an event that is already `ACTIVE`.
- Venue row is already `LEFT` or `REMOVED`.
- Event status changes to `CANCELLED` after venue joined.
- Multi-business account scans for one venue but history query should still show only rows the current user actually scanned.
- `REVOKED` or `MANUAL_REVIEW` stamps should not look identical to clean valid scans in history.
- No history exists yet for a newly onboarded scanner.

## Validation Plan

- Run `apps/mobile` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run export:web`
- Reset local Supabase and run auth-backed smoke checks for:
  1. leave RPC success on future joined event
  2. leave blocked on active event
  3. leave blocked when row is not joined
  4. scan history query returns seeded or generated scan rows
  5. scanner result tone mapping covers success, duplicate, expired, invalid, inactive
- Open the local web preview and verify:
  1. `/business/events`
  2. `/business/scanner`
  3. `/business/history`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
