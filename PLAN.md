# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Strengthen visual identity on rewards, discovery, and profile while keeping the current stamp/reward logic intact and explicitly clarifying what the current backend rules really are.

## Architectural Decisions

- Keep the current STARK direction and avoid another theme fork.
- Rewards should reuse the same event-image language as discovery and detail rather than inventing a separate art direction.
- The horizontal rewards rail needs a subtle but explicit swipe cue so it does not read like a clipped vertical list.
- Profile should expose a clean identity card on the main screen and move tag management into a modal sheet.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Keep rewards cards text-only and only add a swipe label:
  - rejected because the user explicitly wants more visual identity on the reward-event rail
- Keep profile tags inline and just collapse them:
  - rejected because the current issue is clutter; a dedicated modal is the clearer interaction
- Change stamp quota logic immediately:
  - rejected because the user asked a product-rule question, but the safe first step is to confirm and explain the current implementation before a schema/RPC change

## Edge Cases

- Rewards still need to look good when only one event exists in the rail.
- Remote cover images can be absent, so fallback art has to remain deterministic.
- The profile modal cannot trap the user in a disabled state if tag mutations fail.
- The current stamp schema may not match the desired future product rule; that mismatch should be surfaced clearly, not papered over.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the rewards / discovery / profile slice.
- Carry `coverImageUrl` into rewards and add an image-backed hero to reward cards.
- Add a stronger swipe cue to the rewards rail.
- Add an image-backed discovery hero.
- Rework profile into avatar + identity + tag modal flow.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the visual pass and the clarified current stamp-rule note.
