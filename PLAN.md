# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Keep the STARK theme, but reduce page density across every mobile role. Fewer top-level cards, shorter copy, clearer actions, and less visible framing.

## Architectural Decisions

- Keep the current STARK direction and avoid another theme fork.
- Treat each page as a small flow: one entry point, one active state, one fallback.
- Prefer fewer top-level sections over many medium cards with repeated headings.
- Keep lime as the main action accent and use the other colors only as supporting state cues.
- Stay in presentation/layout territory and avoid touching validated business logic.

## Alternatives Considered

- Keep refining only tokens and borders:
  - rejected because the bigger problem is page composition, not token intensity alone
- Flatten every section into plain text on the screen:
  - rejected because scanner, QR, and reward states still need visual grouping
- Start a third theme direction:
  - rejected because the user asked us to continue the current theme logic

## Edge Cases

- Joining, scanning, and leaderboard error states still need visible retry paths even after the card count drops.
- Event detail cannot lose registration clarity while we merge sections.
- Profile suggestions and custom-tag creation still need to stay understandable after they share space.
- Scanner fallback input must remain available even if we reduce its visual weight.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the all-role simplification pass.
- Simplify `student/profile`, `student/leaderboard`, `student/rewards`, `student/active-event`, and `student/events/[eventId]`.
- Simplify `business/home`, `business/history`, `business/events`, and `business/scanner`.
- Remove redundant cards, reduce explanatory copy, and keep only meaningful actions.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note and what remains.
