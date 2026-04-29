# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Reduce rewards number overload, create temporary hosted showcase events for runtime preview, and make the QR surface visible on a real student account without disturbing the validated product logic.

## Architectural Decisions

- Keep the current STARK direction and avoid another theme fork.
- Remove repeated counts before removing whole sections; keep one strong summary number and one clear next-step copy.
- Keep showcase fixture creation in a dedicated admin script instead of ad hoc shell SQL.
- Make the bootstrap script idempotent by cleaning its own `showcase-*` slugs before reseeding.
- Register active student accounts automatically so the QR route is previewable without manual database edits.
- Stay in presentation/layout territory and avoid touching validated business logic.

## Alternatives Considered

- Leave rewards untouched and only add data:
  - rejected because the user explicitly called out unnecessary repeated numbers
- Seed hosted showcase events manually with one-off SQL:
  - rejected because we want a repeatable path and an easy cleanup story later
- Create many fake events:
  - rejected because a small set is enough to preview list, detail, rewards, and QR

## Edge Cases

- If there are no active student profiles in hosted, showcase registration must fail loudly instead of pretending the QR route is ready.
- If an active showcase event already has scans or reward claims later, future cleanup must remove dependent rows first.
- Rewards simplification cannot hide the difference between claimable, claimed, and blocked tiers.
- The temporary showcase event should not steal the app into an invalid state for business flows.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the rewards/showcase slice.
- Simplify the rewards summary and reward progress card number hierarchy.
- Add a hosted showcase bootstrap script and wire it into `apps/admin/package.json`.
- Run the showcase bootstrap so at least one active event is QR-visible and a couple more events exist for design review.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Verify admin script with:
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run bootstrap:showcase-events`
- Update `PROGRESS.md` with the new handoff note and what remains.
