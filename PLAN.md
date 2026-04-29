# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Make profile, rewards, and QR feel cleaner and more premium by reducing repeated labels, strengthening the rewards hero, and shortening the QR follow-up section.

## Architectural Decisions

- Keep the current black / lime / white direction and avoid introducing another visual family.
- Profile should feel like one identity block plus one entry point into tags, not a stack of equally heavy cards.
- Rewards should use one stronger top hero and then let the rail carry the detail.
- The QR screen should stay event-day focused; progress below the QR should be summarized, not fully expanded.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Keep the current profile hero and only delete the `primary` badge:
  - rejected because the avatar and meta area still feel too dense even without that label
- Keep the full reward card below the QR:
  - rejected because it turns the active QR page into a long scroll and repeats information already available elsewhere
- Add more counts to the rewards header:
  - rejected because the user explicitly wants less repeated numeric noise

## Edge Cases

- Profile should still look complete when the student has zero tags.
- Rewards should still have a useful top hero when only one event exists.
- The QR progress summary should work when there are no published reward tiers yet.
- The profile modal cannot trap the user in a disabled state if tag mutations fail.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the refinement slice.
- Simplify profile hero and tags summary; replace initials avatar with icon avatar.
- Strengthen the rewards top section without repeating counts.
- Replace the full reward card under QR with a compact event progress summary.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the refinement handoff note.
