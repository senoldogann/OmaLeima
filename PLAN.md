# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Finish the current student visual pass by making discovery feel edge-to-edge, replacing duplicate profile role wording with meaningful tag context, and fixing the unsafe back action on event detail.

## Architectural Decisions

- Keep the current black / lime / white direction and avoid introducing another visual family.
- Discovery hero should be its own surface, not an image nested inside another card.
- Profile should show either a useful active tag or a fallback role label, not both in the same wording family.
- Event detail back handling should prefer `back()` only when the stack actually exists.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Keep the discovery image inside `InfoCard` and just increase its height:
  - rejected because the outer card padding still leaves visible black gaps around the hero
- Always show role text in profile even when a primary tag exists:
  - rejected because the user explicitly wants tag context there instead of repeated student wording
- Leave `router.back()` as-is because the warning is dev-only:
  - rejected because the root cause is easy to fix and direct entry into the detail screen is a valid path

## Edge Cases

- Profile should still look complete when the student has zero tags.
- Discovery hero copy must still read clearly over fallback cover images.
- Direct event-detail entry must still return the user somewhere sane if no back stack exists.
- The profile modal cannot trap the user in a disabled state if tag mutations fail.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the stabilization slice.
- Move discovery hero out of the nested card and let the image fill the full surface.
- Replace duplicate profile role wording with active tag context.
- Add a safe fallback around event detail back navigation.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the stabilization handoff note.
