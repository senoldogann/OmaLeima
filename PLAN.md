# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Land the final profile-summary and reward-metric spacing polish without reopening the broader settings redesign.

## Architectural Decisions

- Keep department tags as a preference item, but let the summary live under the label instead of in the trailing value column.
- Keep the reward metric visually stacked as one compact unit by tightening spacing, not by rewriting the card structure.

## Alternatives Considered

- Keep the tag summary in the right-side value slot:
  - rejected because long text looks cramped and visually noisy
- Add another label variant just for rewards:
  - rejected because the spacing issue is local to the existing metric block and should stay a styling fix

## Edge Cases

- The department-tag summary must still read clearly when there are zero tags or all slots are full.
- Tightening the reward metric spacing must not cause clipping in light or dark mode.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this final micro-polish slice.
- Keep the department-tag summary calm under the heading.
- Tighten the reward-card number/unit spacing one last time.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
