# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-implementation-foundation`
- **Goal:** Land the first real mobile Realtime subscriptions for student freshness-critical views while keeping the slice small and predictable.

## Architectural Decisions

- Create a dedicated `apps/mobile/src/features/realtime` module so subscription logic does not leak into screen files.
- Use invalidation-based Realtime, not optimistic local patching. The app already has typed React Query fetchers, so invalidating the right keys is lower risk than mutating cached shapes by hand.
- Subscribe to `leaderboard_updates` for leaderboard freshness and to student `stamps` plus own `reward_claims` changes for progress freshness.
- Keep subscriptions screen-scoped and foreground-aware to avoid background socket noise in this first slice.

## Alternatives Considered

- Polling leaderboard and reward queries on an interval:
  - rejected because the backend already writes explicit freshness signals and the planned architecture calls for Realtime
- Patching React Query cache payloads directly from Realtime callbacks:
  - rejected because the reward and leaderboard shapes are derived from multiple tables and RPC output, so targeted invalidation is simpler and safer
- Wiring every student screen into Realtime immediately:
  - rejected because the first slice should stay with the highest-value screens only

## Edge Cases

- The student stamp subscription should not invalidate reward queries for unrelated events.
- Realtime callbacks can fire on `UPDATE` and `DELETE` as well as `INSERT`, so the invalidation path must not assume only one event type.
- Reward progress depends on `validation_status = VALID`, so the callback should only invalidate when the changed row matters to that read model.
- Shared reward inventory can still change because of other students' claims, so this first slice should not over-document inventory freshness as Realtime-complete.
- The leaderboard screen can switch selected events, so the subscription must track the current event and cleanly resubscribe.

## Validation Plan

- Run `apps/mobile` lint and typecheck.
- Re-run the new `audit:realtime-readiness` command; it should now fail because the deferred state changed, so the audit and docs must be updated in the same slice.
- Add a reviewer pass because Realtime false positives and overbroad invalidation are easy to miss.
