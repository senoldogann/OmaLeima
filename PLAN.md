# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/realtime-readiness-audit`
- **Goal:** Turn the mobile Realtime question into an explicit, testable repository state instead of leaving it as an assumption buried in the master plan.

## Architectural Decisions

- Add a lightweight audit command under `apps/mobile/scripts` instead of shipping partial Realtime code just to satisfy the plan wording.
- Treat the current mobile state as "deferred Realtime with QR polling already in place" unless the audit finds real client subscriptions.
- Keep the audit read-only and deterministic: it should inspect source files and declared package scripts, not require a running socket server.
- Expose the audit both at the `apps/mobile` level and at the repo root so future agents can find it the same way they find the existing QA commands.

## Alternatives Considered

- Implementing the full mobile Realtime subscription layer right now:
  - rejected because the current request is to take the next correct step, and the highest-value gap is first understanding and documenting the current state cleanly
- Leaving the ambiguity untouched because the app already works with query fetches:
  - rejected because the master plan explicitly promises Realtime and future agents need a clear answer about what is still missing
- Hiding the decision only in `PROGRESS.md` handoff text:
  - rejected because handoff notes are too transient for an ongoing architectural gap

## Edge Cases

- QR rotation already uses polling by design, so the audit must not misclassify that path as a missing Realtime bug.
- If a future slice starts adding `supabase.channel(...)` or `postgres_changes` listeners, the audit should fail loudly until its expected-state logic and docs are updated.
- The plan still names `apps/mobile/src/features/realtime` as an output, so the audit notes must distinguish between "planned" and "currently shipped."

## Validation Plan

- Run the new `apps/mobile` Realtime audit directly.
- Run `apps/mobile` lint and typecheck after adding the new script wiring.
- Run the root wrapper so the audit is discoverable through the repo-level QA entry points too.
- Get a reviewer pass on the final slice because this is a repo-behavior clarification, not just a local note.
