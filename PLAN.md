# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/owner-checklist-tr`
- **Goal:** Add a short Turkish owner-facing checklist that tells the user what they do not need to worry about yet, what they will need to do once the app is more complete, and how this fits into the existing technical roadmap.

## Architectural Decisions

- Keep this slice documentation-first.
- Reuse `docs/LAUNCH_RUNBOOK.md` and add a compact Turkish section instead of creating a second owner document.
- Keep the Turkish part limited to the user's decisions and timing; the rest of the runbook can stay in English.
- Explicitly mark club outreach, real operator account creation, and domain purchase as deferred until the app is more complete.

## Alternatives Considered

- Creating a separate Turkish checklist file:
  - rejected because the launch runbook is already the natural place for owner actions
- Translating the full runbook:
  - rejected because the user only asked for the parts they need to act on
- Leaving the current English-only owner section unchanged:
  - rejected because the user asked for a clearer note/todolist and we should meet them where they are

## Edge Cases

- The Turkish checklist should not imply that the user must find a real club right now.
- The notes should separate “not needed yet” from “needed when pilot planning starts.”
- The next technical step should still remain visible after the owner note is added.

## Validation Plan

- Update `docs/LAUNCH_RUNBOOK.md` with the Turkish owner checklist.
- Add a short pointer in `README.md`.
- Run a focused sanity pass on the new headings and wording.
- Update `PROGRESS.md` and the working docs.
