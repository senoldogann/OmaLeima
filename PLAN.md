# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-30
- **Branch:** `feature/deep-project-review`
- **Goal:** Run a post-merge deep review on top of `main`, fix any remaining real defects or process drift, and leave the branch clean enough to merge back without hidden regressions.

## Architectural Decisions

- Treat this pass as a narrow correctness/hardening slice, not a fresh redesign or new feature wave.
- Keep the new support flow as-is architecturally unless review finds a real security, product, or maintainability defect.
- Use reviewer delegation for an extra correctness pass, but keep local ownership of fixes and merge flow.
- Preserve the repo’s phased/process discipline by updating the working docs even if the resulting code diff is small.
- Treat mobile/admin validations and the readiness audits as the hard merge gate again.

## Alternatives Considered

- Skip a new review because `main` is already green:
  - rejected because the user explicitly wants a deep final pass and reviewer-backed confidence
- Re-open broad UI polish during this audit:
  - rejected because it would blur review findings with subjective redesign changes
- Change the support architecture again:
  - rejected unless a real defect shows up; churn would add more risk than value

## Edge Cases

- The review may find no real code changes are needed; in that case we still need truthful docs and validation evidence.
- Support UI should stay stable when there are no business memberships, no previous requests, or pending submissions.
- Recent route/copy/theme work could hide repeated text or stale labels in less-traveled screens.
- Validation must ignore the known untracked `.idea/` folder and not try to clean it up.
- `qa:phase6-readiness` may still remain environment-blocked if local Docker stays off; that should be documented honestly, not papered over.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this deep-review slice.
- Run local inspection plus at least one reviewer subagent pass.
- Search for obvious drift markers (`TODO`, stale copy, broken routes, duplicated UI text where practical).
- Fix only the concrete defects found.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
  - `npm --prefix apps/admin run lint`
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run build`
- Rerun the touched readiness audits if code changes affect them.
- Document the exact outcome in `PROGRESS.md`, including any environment-only blockers.
