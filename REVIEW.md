# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-hosted-staging-and-clickpath`
- **Scope:** Post-Phase 6 browser click-path smoke for the highest-risk admin review flow, with local QA wiring that can lead into hosted staging later.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/README.md`
- `apps/admin/package.json`
- `apps/admin/package-lock.json`
- `apps/admin/scripts/*`
- `docs/TESTING.md`
- `tests/*`
- root `package.json`

## Risks

- Browser smoke can become flaky if selectors depend on broad text instead of stable UI anchors.
- The admin review flow mutates real data through route-backed Edge Function calls, so cleanup must remove approved businesses as well as reviewed application rows.
- Playwright setup can create false confidence if the script only checks navigation and never proves approve and reject state changes in the DB.
- This flow depends on the local admin app, local function server, and local Supabase stack together. Missing one service should fail early and clearly.
- If we overreach into many dashboards at once, the smoke will become slow and brittle. The slice should stay focused on the single highest-value click path.

## Dependencies

- Existing admin smoke scripts in `apps/admin/scripts`, especially `smoke-business-applications`.
- Existing local Supabase reset flow, local function server flow, and seeded admin account.
- Existing function-backed smoke helpers under `apps/admin/scripts/_shared`.
- The current `/login` screen, `/admin/business-applications` route, and route-backed review API endpoints.
- Project-local Playwright dependency and browser binary setup in `apps/admin`.
- Existing feature-level docs in `apps/admin/README.md` and `docs/TESTING.md`.

## Existing Logic Checked

- `smoke:business-applications` already proves the backend review path with fetch-based route calls, queue pagination, and DB state assertions.
- The login UI and pending review card UI already expose one complete admin flow that can be driven in a real browser without inventing new product behavior.
- Current route smoke proves redirects and auth boundaries, but it does not prove a user can actually sign in, navigate, click approve, open the reject form, submit a reason, and observe a successful end-to-end review path in the browser.
- There is no current browser-based smoke in the repo, so this is the thinnest missing quality layer before hosted staging work.

## Review Outcome

Build the smallest high-value post-Phase 6 browser slice that:

- adds a real browser smoke for admin login plus business application approve and reject flow
- uses stable selectors or minimal `data-testid` anchors where needed
- proves DB state changes after browser actions instead of only checking text
- adds a focused root runner or script entry for the new browser smoke
- updates docs so the team knows when to run this local click-path layer before hosted staging
