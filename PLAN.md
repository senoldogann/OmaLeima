# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Add real event imagery to the student discovery flow and preserve the current STARK black-lime-white theme. Use reliable local cover assets plus any remote `cover_image_url` values, and store the Canva poster outputs as linked handoff material.

## Architectural Decisions

- Keep the current STARK direction and avoid another theme fork.
- Add one small event-visual helper instead of scattering `require(...)` calls through route files.
- Prefer remote `coverImageUrl` when present; otherwise derive a stable local fallback from the event id/name.
- Use dark overlays directly inside event cards and hero surfaces so text stays readable without adding more boxes.
- Keep Canva posters as external links in docs instead of shipping half-exported images into the app bundle.
- Stay in presentation/layout territory and avoid touching validated business logic.

## Alternatives Considered

- Use Canva-generated files directly in the app bundle:
  - rejected because the current exported thumbnail links do not resolve to usable image binaries from this environment
- Hardcode one image per screen:
  - rejected because event cards need deterministic variation and should respect future remote `cover_image_url` data
- Add imagery to every route at once:
  - rejected because event discovery and detail screens benefit first and keep the change set safer

## Edge Cases

- Some events may already have `cover_image_url`; do not override those with local fallbacks.
- Some events may have null or broken covers; fall back without crashing.
- Static asset imports must work on native and Expo web export.
- The event detail hero still needs clear registration and timing info over the image background.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for the event-imagery slice.
- Delete the broken Canva-export placeholder files from the asset directories.
- Add a typed event-cover helper with local fallback assets.
- Extend student event summary fetching with `cover_image_url`.
- Update event card and event detail hero presentation to render real imagery with dark overlays.
- Add a short Canva / imagery handoff doc with poster links and source references.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note and what remains.
