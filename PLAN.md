# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Strip engineering diagnostics out of the shipped mobile UI, keep the STARK theme intact, and verify whether the hosted admin login issue is a real app bug or just preview protection.

## Architectural Decisions

- Keep the current STARK theme language; this pass is about product boundary cleanup, not another visual pivot.
- Remove debug and diagnostics panels from normal user flows instead of merely restyling them.
- Preserve true error states and recovery actions; users still need graceful failure handling.
- Simplify notification settings into a user-facing opt-in card rather than exposing runtime smoke internals.
- Treat the hosted admin report as two separate checks:
  - local admin app must still lint, typecheck, and build
  - hosted login URL must be checked at the HTTP layer for protection vs runtime failure

## Alternatives Considered

- Leave diagnostics visible but hide them under smaller cards:
  - rejected because the issue is not only visual noise; the content itself is not meant for normal users
- Remove all error and auth-state feedback too:
  - rejected because that would hurt recovery when auth or profile loading actually fails
- Change hosted admin auth logic immediately:
  - rejected because the current evidence points to Vercel preview protection, so changing route code first would be guesswork

## Edge Cases

- The profile screen still needs a clear notification action even after diagnostics are removed; otherwise push opt-in becomes harder to discover.
- The QR route still needs visible error and retry behavior when token refresh fails.
- Some status cards are used in auth callback and access-resolution flows. Those should become simple loading or error copy, not disappear entirely.
- The hosted admin URL may remain inaccessible from the browser until the Vercel protection layer is satisfied, even if local code is healthy.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the UI cleanup slice.
- Remove diagnostics from:
  - `auth/login`
  - `auth/callback`
  - `student/events/index`
  - `student/active-event`
  - `student/profile`
- Keep push enablement functional while simplifying profile presentation.
- Verify admin locally with:
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run build`
- Verify hosted admin response with a direct HTTP check.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the cleanup handoff note and the Vercel protection finding.
