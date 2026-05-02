# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `bug/reward-cover-slider-layout`
- **Scope:** Fix student rewards event image consistency and keep the Palkinnot slider pagination from being pushed down by oversized cards.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/student/rewards.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/app/student/leaderboard.tsx`
- `apps/mobile/src/features/rewards/components/reward-progress-card.tsx`

## Risks

- Event cover fallback must be keyed by the event identity on every event-specific surface; purpose-based fallback images are only safe for generic empty/hero states.
- The rewards rail should stay a compact preview. Long reward tier lists must not force every slider item and indicator row to inherit the tallest card height.
- Remote cover URLs must keep winning over fallback art.
- This branch must not stage the user-owned `apps/mobile/package.json` script changes, `RAPOR.md`, or `.idea/` metadata.

## Dependencies

- `getEventCoverSource` already provides deterministic event-key fallback behavior.
- Event cards and reward progress cards already use `${event.id}:${event.name}` as the fallback key.
- The event detail, active QR pass, leaderboard hero, and rewards hero still use purpose fallbacks for event-specific images.
- `RewardProgressCard` currently renders every reward tier inside a horizontal slider card.

## Existing Logic Checked

- `apps/mobile/src/features/events/components/event-card.tsx` and `RewardProgressCard` already agree on deterministic fallback images.
- `apps/mobile/src/app/student/events/[eventId].tsx` is the main mismatch for the user-reported Palkinnot vs Tapahtuma tiedot difference.
- The rewards slider does not need all tier details because the card already links to the event detail route.

## Review Outcome

Use the same deterministic event cover selection on every event-specific student surface. Convert the rewards slider card into a compact preview by limiting visible tiers and preserving detailed reward text for the event detail path.
