# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-staging-verification-and-deploy-automation`
- **Goal:** Add the first hosted staging verification layer and wire it into a reusable workflow path before touching production deploy automation.

## Architectural Decisions

- Keep hosted verification under `apps/admin/scripts/` and run it with `tsx`, matching the rest of the QA surface.
- Reuse shared Playwright helpers from the local browser smoke instead of building a second browser stack from scratch.
- Scope the first hosted smoke to one non-mutating admin flow:
  1. open `/login`
  2. verify anonymous `/admin` redirects to `/login`
  3. sign in as an env-provided admin credential
  4. land on `/admin`
  5. navigate to `/admin/oversight`
  6. navigate to `/admin/business-applications`
  7. navigate to `/admin/department-tags`
  8. sign out and verify return to `/login`
- Keep assertions dataset-independent by checking route URLs and top-level titles, not pending queue contents.
- Add a root runner that validates required hosted env vars and runs the hosted smoke directly.
- Add a GitHub Actions workflow with two triggers:
  1. `workflow_dispatch` with URL input
  2. `deployment_status` for successful deployments, using the target URL when available

## Alternatives Considered

- Automating hosted approve/reject mutations immediately:
  - rejected because hosted fixtures are not deterministic yet and we should not mutate shared staging state casually
- Building Vercel-specific deploy scripts first:
  - rejected because the repo is not yet linked in a visible, durable way and the first missing layer is verification, not another opaque deploy button
- Limiting the workflow to manual dispatch only:
  - rejected because deployment-status support is the cleanest bridge once Vercel Git integration is connected
- Expanding into club routes in the same first hosted smoke:
  - rejected because one admin-only path is enough to establish the pattern without making the workflow brittle

## Edge Cases

- Hosted previews may be protected. The workflow and docs must make clear that inaccessible URLs will fail at preflight instead of silently skipping.
- Some staging environments may redirect `/` differently than local. The script should anchor on `/login` and specific admin routes, not the root path.
- Sign-in can race route hydration on hosted builds, so URL and heading checks both need bounded waits.
- The workflow should skip deployment-status runs that do not include a target URL rather than failing with a null base URL.
- Browser binaries may be missing in CI, so the workflow must install Chromium with Playwright’s supported path.

## Validation Plan

- Add shared Playwright helpers and a new hosted admin smoke.
- Add a root hosted verification runner.
- Add a GitHub Actions workflow for manual and deployment-status execution.
- Validate locally against the running admin app with seeded admin credentials:
  1. `rtk supabase db reset --yes`
  2. `cd apps/admin && rtk npm run dev -- --hostname 127.0.0.1 --port 3001`
  3. `ADMIN_APP_BASE_URL=http://localhost:3001 STAGING_ADMIN_EMAIL=admin@omaleima.test STAGING_ADMIN_PASSWORD=password123 rtk npm --prefix apps/admin run smoke:hosted-admin-access`
  4. `ADMIN_APP_BASE_URL=http://localhost:3001 STAGING_ADMIN_EMAIL=admin@omaleima.test STAGING_ADMIN_PASSWORD=password123 rtk node tests/run-staging-admin-verification.mjs`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`, `README.md`, `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md`.
