# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/launch-readiness-pack`
- **Goal:** Make launch readiness concrete: what is already proven, what still needs user-owned external setup, and what the real private-pilot versus public-launch gates are.

## Architectural Decisions

- Keep this slice documentation-first. The code and smoke path are already in good shape; the missing piece is operational clarity.
- Reuse `docs/LAUNCH_RUNBOOK.md` as the single home for pilot rollout, rollback, and owner action items instead of adding another overlapping launch doc.
- Add a short readiness summary to `README.md` so the repo landing page reflects the actual current state without making the user dig through progress notes.
- Keep domain purchase and app-store work explicitly parked unless they are true blockers for the next hosted pilot.

## Alternatives Considered

- Creating a brand new GTM or rollout document:
  - rejected because the current runbook already covers event-day and rollback logic; it just needs tighter owner-facing sections
- Leaving launch guidance only in `PROGRESS.md` handoffs:
  - rejected because that makes the next human setup steps easy to miss
- Treating domain purchase and public-store release as immediate blockers:
  - rejected because the user explicitly wants those later and the next practical step is a controlled pilot, not public release

## Edge Cases

- The runbook must clearly distinguish temporary hosted smoke accounts from real operator credentials.
- The user should be able to see which tasks are mandatory before a private pilot and which can wait until public launch.
- We should not imply Android or public store readiness is complete when only the iPhone path has been physically verified.
- The updated README summary must stay short and should point to the runbook rather than duplicate it.

## Validation Plan

- Review and update `docs/LAUNCH_RUNBOOK.md` and `README.md`.
- Run a lightweight documentation sanity pass by checking the updated sections render logically and do not contradict the current hosted smoke state.
- Update `PROGRESS.md` and the working docs with the new launch-readiness guidance.
