# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Repair student event detail navigation and turn event discovery plus leaderboard into cleaner, more characterful surfaces without changing their validated data flows.

## Architectural Decisions

- Keep the current STARK direction and avoid another theme fork.
- Use explicit Expo Router pathname navigation for event detail so links behave the same on web and native.
- Event discovery should privilege one strong cover, one time/location line, and one action path per card.
- Leaderboard should split into two layers:
  - a compact selected-event / freshness header
  - a podium-like top-three showcase plus a cleaner standings list
- Stay in presentation/layout territory and avoid touching validated business logic.

## Alternatives Considered

- Keep relative routing and only massage the event list UI:
  - rejected because the user already hit a real broken page; the navigation path itself has to be corrected
- Make leaderboard more decorative with heavy 3D or animated flourishes:
  - rejected because readability and ranking clarity matter more than spectacle
- Replace the standings list entirely with only a podium:
  - rejected because ranks 4-10 and current-user context still matter

## Edge Cases

- Event detail navigation must still work when ids contain hyphens or when opened from web.
- Leaderboard must degrade gracefully when only one or two entries exist.
- If current user is outside top three, the personal rank still needs to remain visible and not feel lost.
- Event cards cannot become so minimal that registration context disappears.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the event-discovery / leaderboard slice.
- Fix event discovery navigation with explicit pathname routing.
- Tighten `EventCard` metadata and the discovery hero.
- Redesign leaderboard around a podium + standings split.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Use the local browser to sanity-check at least one updated route after the code pass.
- Update `PROGRESS.md` with the new handoff note and the next remaining design gaps.
