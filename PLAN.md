# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Finish the next cleanup pass by making discovery imagery deliberately unique, trimming duplicate profile/tag copy, and simplifying the My QR header after the new slider work.

## Architectural Decisions

- Keep the current black / lime / white direction and avoid introducing another color family.
- Discovery slider should choose fallback assets explicitly instead of relying on hash-based selection.
- My QR should let the event hero carry the identity while the strip above the QR stays minimal.
- Profile account metadata should keep only one non-redundant summary signal.
- Stay in presentation/layout territory and avoid touching validated stamp business logic in this pass.

## Alternatives Considered

- Leave discovery on hash-based fallback selection:
  - rejected because repeated images undercut the whole slider idea
- Keep the student display name above the QR:
  - rejected because the hero already identifies the event and the extra line steals vertical room
- Keep tag counts in both profile header and department-tags entry:
  - rejected because the same information reads as clutter instead of reassurance

## Edge Cases

- Discovery must still work when only fallback assets are available.
- My QR should still read well when the selected event exists but reward overview is missing.
- Profile should still feel complete even when the department-tags section is empty.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this slice.
- Add explicit fallback-image selection for discovery slides.
- Remove duplicate name/tag chrome from My QR and profile.
- Verify mobile with:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the new handoff note.
