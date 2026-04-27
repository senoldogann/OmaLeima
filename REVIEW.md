# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan önce sistem analizini kaydetmek için kullanılır.

## Current Review

- **Date:** 2026-04-27
- **Branch:** `feature/agent-planning-docs`
- **Scope:** Agent workflow documentation.

## Affected Files

- `AGENTS.md`
- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`

## Risks

- Agents may skip design and start coding directly.
- Planning docs may become stale if they are treated as changelog instead of current working context.
- Too much process can slow down small changes if templates are too heavy.

## Dependencies

- `PROGRESS.md` remains the source of truth for completed phase progress and handoff.
- `LEIMA_APP_MASTER_PLAN.md` remains the source of truth for product and technical architecture.
- `AGENTS.md` remains the source of truth for mandatory agent behavior.

## Existing Logic Checked

- Existing `AGENTS.md` already requires phase discipline, branch isolation, progress tracking, and latest handoff.
- Existing `PROGRESS.md` already tracks phase status and latest agent handoff.

## Review Outcome

Add lightweight working docs and make them mandatory through `AGENTS.md`.
