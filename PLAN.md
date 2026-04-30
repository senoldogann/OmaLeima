# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Make the profile settings feel like one coherent control surface and tighten the last visible reward-card spacing issue.

## Architectural Decisions

- Treat department tags as a preference item, not as a separate page block.
- Use outside-tap dismissal on both lightweight preference sheets and the tag-management modal.
- Remove headings when the action control itself is already self-explanatory.
- Keep the reward metric visually stacked as one compact unit.

## Alternatives Considered

- Leave tags outside the settings card:
  - rejected because profile management still feels split across separate blocks
- Keep modal dismissal only on the done button:
  - rejected because it is slower and feels unfinished for lightweight selectors
- Keep the sign-out label above the button:
  - rejected because the button text already says exactly what the action does

## Edge Cases

- Tapping inside the modal content must not close the modal accidentally.
- The profile settings card must still read clearly even when tags are long and the summary wraps.
- Tightening the reward metric spacing must not cause clipping in light or dark mode.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this settings/spacing polish slice.
- Make preference sheets and tag modal dismiss on outside tap.
- Move department tags into the settings card.
- Remove the extra sign-out heading.
- Tighten the reward-card number/unit spacing.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
