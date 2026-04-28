# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-staging-verification-and-deploy-automation`
- **Scope:** Post-Phase 6 hosted staging verification and deploy-adjacent automation for the admin panel, starting with a non-mutating browser smoke that can run against Vercel preview or staging URLs.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `.github/workflows/*`
- `apps/admin/README.md`
- `apps/admin/package.json`
- `apps/admin/scripts/*`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`
- `tests/*`
- root `package.json`

## Risks

- Hosted smoke can become flaky if it depends on local seed fixtures or mutating review actions. The hosted path must stay read-only and credential-driven.
- Vercel preview protection can block unattended requests. The workflow must support manual URL input and the docs must say when a protected preview needs team access or a bypass path.
- Deployment-status automation is only useful when the repository is actually connected to Vercel. The workflow should still be manually runnable without that integration.
- Browser checks that only load `/login` are too weak; we need at least one authenticated navigation path across the real admin shell.
- We should avoid assuming a specific hosted dataset. Assertions must target stable route titles and redirect behavior, not seed-specific queue contents.

## Dependencies

- Existing admin smoke scripts in `apps/admin/scripts`, especially `smoke-browser-admin-review` and `smoke-routes`.
- Existing local and hosted login screen plus admin shell routes: `/login`, `/admin`, `/admin/oversight`, `/admin/business-applications`, `/admin/department-tags`.
- Project-local Playwright dependency and browser binary setup in `apps/admin`.
- Existing feature-level docs in `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md`.
- GitHub Actions workflow syntax and Playwright CI guidance.
- Vercel preview deployment and custom environment behavior.

## Existing Logic Checked

- `smoke-browser-admin-review` now covers the highest-risk local mutation path, but it depends on local SQL seeding and cannot run unchanged against hosted staging.
- `smoke-routes` proves route redirects with cookie-backed fetch requests, but it is not a browser flow and does not validate real interactive navigation on deployed URLs.
- The admin shell already exposes stable page titles and navigation labels that can support a hosted read-only browser smoke without introducing product-only test hooks.
- There is no current GitHub Actions workflow in the repo, so hosted smoke and deployment-adjacent verification are not yet automated.

## Review Outcome

Build the smallest high-value hosted verification slice that:

- adds a read-only Playwright smoke for hosted admin login and authenticated route navigation
- keeps the hosted flow environment-driven so it can run against local, preview, or staging URLs
- adds a root runner for hosted verification that does not assume local DB reset or function server access
- adds a GitHub Actions workflow that can run manually and also react to successful deployment status events
- updates launch and testing docs so preview, staging, and production verification expectations are explicit
