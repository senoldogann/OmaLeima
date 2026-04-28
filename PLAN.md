# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-inventory-followup`
- **Goal:** Close the next highest-value freshness gap by making shared reward inventory updates visible without waiting for manual refetches.

## Architectural Decisions

- Keep building inside the existing `apps/mobile/src/features/realtime` module instead of spreading another layer of screen-local subscriptions.
- Continue using invalidation-based Realtime instead of cache patching.
- Add `reward_tiers` inventory invalidation for tracked event ids only.
- Keep subscriptions screen-scoped and foreground-aware, with the existing catch-up invalidation pattern when the app or tab returns.

## Alternatives Considered

- Leaving shared reward inventory on snapshots until a later notification slice:
  - rejected because it already creates visible stale states such as out-of-stock lag after another student claims the last reward
- Adding a global unfiltered `reward_tiers` subscription with blind invalidation:
  - rejected because even the mobile first cut should stay scoped to the currently visible student event set
- Bundling reward unlock notification UX into the same change:
  - rejected because that is a separate product and behavior slice

## Edge Cases

- Rewards overview can cover multiple events, so the inventory hook must track a set of visible event ids.
- Event detail uses a separate query key from rewards overview/event progress and must be invalidated too.
- `reward_tiers` changes can be inserts, updates, deletes, disables, or inventory count changes; the callback should treat any matching event change as freshness-relevant.
- Notification state is still separate from inventory freshness, so docs must not imply reward-unlocked push UX is now shipped.

## Validation Plan

- Run `apps/mobile` lint, typecheck, the Realtime audit, and `export:web`.
- Add a reviewer pass because event-scoped invalidation mistakes and audit overclaims are easy to miss here too.
