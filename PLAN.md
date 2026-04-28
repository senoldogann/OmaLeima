# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-hosted-staging-and-clickpath`
- **Goal:** Add one deterministic browser click-path smoke for the highest-risk admin review flow before moving on to hosted staging validation.

## Architectural Decisions

- Keep the browser smoke under `apps/admin/scripts/` and run it with `tsx`, matching the rest of the local QA surface.
- Use Playwright in project dependencies instead of an ad hoc external tool so the repo owns the browser automation path.
- Scope the first browser smoke to one flow only:
  1. open `/login`
  2. sign in as seeded platform admin
  3. navigate to `/admin/business-applications`
  4. approve one seeded pending application
  5. reject one seeded pending application with a reason
  6. verify resulting DB state
- Reuse direct DB seeding and cleanup around the browser flow so the test stays deterministic and does not depend on old queue state.
- Add stable selectors only where the current UI would otherwise force brittle nth-child or duplicate-button matching.
- Add a small root runner that preflights the admin app and function server, then runs the browser smoke.

## Alternatives Considered

- Starting with hosted staging in this slice:
  - rejected because we do not yet have a repo-owned browser click-path smoke to bring into staging unchanged
- Covering multiple admin and club routes in one browser script:
  - rejected because the first browser layer should stay small and reliable
- Keeping the flow at fetch-only route smoke level:
  - rejected because the missing assurance is the real browser interaction path, not another API-level confirmation
- Adding broad UI refactors for testability:
  - rejected because this slice only needs minimal selector anchors, not a redesign

## Edge Cases

- Login redirect must be awaited correctly or the script will race the dashboard shell.
- Approve removes the card from the pending queue, while reject requires opening a hidden form first; both UI states need distinct waits.
- Cleanup must remove approved `businesses` rows created by the approve path, not only application rows.
- Browser binaries may be missing on a new machine, so docs must mention Playwright install explicitly.
- The script should fail early with a clear message if the admin app or local function server is not reachable.

## Validation Plan

- Install and wire Playwright in `apps/admin`.
- Run direct validation while developing:
  1. `rtk supabase db reset --yes`
  2. `rtk supabase functions serve --env-file supabase/.env.local`
  3. `cd apps/admin && rtk npm run smoke:browser-admin-review`
- Run the root click-path runner:
  1. `rtk node tests/run-browser-admin-review.mjs`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`, `apps/admin/README.md`, `docs/TESTING.md`, and root `package.json`.
