# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-27
- **Branch:** `feature/agent-planning-docs`
- **Goal:** Require agents to analyze, design, and break work into small steps before implementation.

## Architectural Decisions

- Keep `PROGRESS.md` for completed progress and handoff.
- Add `REVIEW.md` for pre-work system analysis.
- Add `PLAN.md` for implementation design before code.
- Add `TODOS.md` for small executable tasks.
- Register all three files in `AGENTS.md` so future agents must use them.

## Alternatives Considered

- Put everything into `PROGRESS.md`: rejected because progress tracking and active planning would become mixed.
- Put everything into `AGENTS.md`: rejected because AGENTS should define rules, not hold changing per-branch work context.
- Create only one planning file: rejected because analysis, design, and execution tracking serve different purposes.

## Edge Cases

- Tiny documentation-only changes still need a minimal review/plan/todo update.
- If a branch is interrupted, the next agent must be able to continue from `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
- Completed work must still be summarized in `PROGRESS.md`; the planning files do not replace it.

## Validation Plan

- Confirm the new files exist.
- Confirm `AGENTS.md` explicitly requires using them.
- Confirm `PROGRESS.md` handoff mentions the workflow change.
