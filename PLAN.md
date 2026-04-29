# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Goal:** Hand off the redesign cleanly to another agent by turning the current design scope into one repo-owned reference document.

## Architectural Decisions

- Keep this turn docs-only. Do not leave half-finished visual code changes in the branch.
- Put the redesign handoff inside the repo so it travels with the branch and PR history.
- Group the file inventory by surface area: mobile foundation, student routes, business routes, admin/club web routes.
- Capture both remote Stitch URLs and local Desktop exports because the next agent may need either the live reference or the already-exported assets.
- Record explicit guardrails: preserve validated auth, QR, scanner, stamp, reward, and push flows unless a visual task absolutely forces a safe markup-only adjustment.

## Alternatives Considered

- Continue redesign implementation myself:
  - rejected because the user explicitly wants another agent to own the design work
- Create only a short note in `PROGRESS.md`:
  - rejected because another agent needs an actual file map and visual brief, not just a handoff paragraph
- Store the design inventory outside the repo:
  - rejected because the redesign branch itself should carry the current scope and constraints

## Edge Cases

- The handoff file should not imply that every listed file must change; some are support files or shared primitives that the next agent may inspect first.
- The local Stitch folders contain multiple exports and screenshots. The handoff should point to the relevant roots and not overwhelm the next agent with raw dumps.
- Admin web and mobile references intentionally differ a bit; the handoff should explain the shared spirit instead of forcing literal one-to-one visual copying.
- The user wants future work to continue in the same process discipline, so the handoff must be specific enough that the next agent can update `REVIEW.md`, `PLAN.md`, and `TODOS.md` from it directly.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` to reflect the handoff-only scope.
- Create `docs/UI_REDESIGN_AGENT_HANDOFF.md` with references, file inventory, sequence, and guardrails.
- Update `PROGRESS.md` latest handoff so the redesign execution clearly moves to another agent.
- Keep code unchanged in this turn; no frontend validation is needed if only docs change.
