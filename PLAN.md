# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `bug/reward-cover-slider-layout`
- **Goal:** Make event cover imagery consistent between Palkinnot and Tapahtuma tiedot, and prevent the Palkinnot slider dots from being pushed down by long reward cards.

## Architectural Decisions

- Use `getEventCoverSource(coverImageUrl, eventKey)` for event-specific student screens.
- Keep `getEventCoverSourceWithFallback` for generic hero/empty states where there is no concrete event identity.
- Keep reward slider cards compact by rendering only the first two reward tiers and summarizing the remaining tier count.
- Preserve the full event/reward detail route as the place for deeper copy and complete reward information.
- Do not stage or modify user-owned local script changes or editor metadata.

## Alternatives Considered

- Change the fallback index for `eventDetail`:
  - rejected because it would still allow other event-specific surfaces to drift from rewards later
- Give the entire slider a fixed height:
  - rejected because it risks clipping localized Finnish/English content on small screens
- Hide slider dots:
  - rejected because the dots are useful for communicating that the section is a carousel

## Edge Cases

- Remote cover URL should show the same uploaded image everywhere.
- Events without remote cover URL should show the same deterministic fallback image everywhere.
- Events with many reward tiers should show a compact slider preview without losing the link to details.
- Finnish/English tier summary copy should stay short enough for mobile carousel cards.
- Typecheck, lint, export, and diff checks must pass where available.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
