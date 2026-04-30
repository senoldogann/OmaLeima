# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Finish the redesign branch with a real review-and-merge pass instead of one more isolated UI tweak.

## Architectural Decisions

- Prefer removing duplicate UI signals over adding new copy.
- Treat mobile and admin validations as the hard merge gate.
- Merge only after the branch is clean apart from the known ignored/untracked local IDE folder.

## Alternatives Considered

- Keep the duplicate `READY` label in the reward metric:
  - rejected because the hero already communicates claimable state
- Merge without re-running admin validation:
  - rejected because this branch touched both mobile and admin surfaces

## Edge Cases

- The reward card still needs to read clearly when a tier is claimable even after removing the duplicate label.
- Branch-wide validation must ignore the known untracked `.idea/` folder and not try to clean it up.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this final review/merge slice.
- Remove the duplicate reward-card `READY` label near `LEIMAT`.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Rerun:
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run build`
- Check `git status --short` before merge.
- Update `PROGRESS.md` with the exact outcome and next remaining gap.
