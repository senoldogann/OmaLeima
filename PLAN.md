# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/readiness-priority-matrix`
- **Goal:** Convert the current verified state into a small, durable priority matrix so we can keep building in the right order without losing the phased plan.

## Architectural Decisions

- Keep this slice documentation-first and scoped to existing readiness docs.
- Do not create a new standalone checklist file unless the existing launch and testing docs cannot hold the matrix cleanly.
- Use three buckets only: `must-have before private pilot`, `needed before broader public launch`, and `later`.
- Explicitly mention which verifications are already done manually so we stop re-asking the same questions.

## Alternatives Considered

- Creating a brand-new `readiness.md` file:
  - rejected because the project already uses `README.md` and `docs/LAUNCH_RUNBOOK.md` for this kind of current-state guidance
- Leaving the current docs as-is and deciding next steps ad hoc:
  - rejected because we are at the point where repeated manual verification can waste time if priorities stay fuzzy
- Treating Android emulator success as the same as Android launch readiness:
  - rejected because the missing part is still specifically Android remote push on a physical device

## Edge Cases

- The matrix should not accidentally make domain purchase, store release, or full UI redesign look like current blockers.
- The docs should preserve the fact that there is no real club yet, and that this is not blocking core product completion today.
- The owner-facing Turkish note should stay short and action-oriented.

## Validation Plan

- Update the working docs.
- Update `README.md`, `docs/LAUNCH_RUNBOOK.md`, and `docs/TESTING.md` with the priority matrix.
- Run a focused sanity pass with `rg` across the updated anchors.
