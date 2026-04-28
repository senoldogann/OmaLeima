# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-vercel-linking-and-preview-secrets`
- **Scope:** Post-Phase 6 Vercel linking and preview-secret hardening for the admin panel, with repo-owned preflight checks that fail early when hosted env setup is incomplete.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/README.md`
- `apps/admin/.env.example`
- `apps/admin/package.json`
- `apps/admin/scripts/*`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`
- `.github/workflows/*`
- root `package.json`

## Risks

- Preview and staging deployments can fail with generic build errors if required public env vars are missing or still point at localhost.
- A repo-level workflow is not enough if the app build itself does not enforce hosted-safe values. We need an explicit prebuild check.
- We still do not have a visible linked Vercel project in this environment, so docs must avoid pretending the link already exists.
- Secret setup can drift between Vercel Preview, Vercel Production, and GitHub Actions repo secrets. The required sets need to be explicit.
- Over-documenting with vague deployment prose is not useful; the output should stay concrete and command-oriented.

## Dependencies

- Existing admin env parsing in `apps/admin/src/lib/env.ts`.
- Existing hosted verification workflow and smoke path added in the previous slice.
- Existing admin README, testing docs, and launch runbook.
- Vercel system environment variables and environment-scoped variable behavior.
- GitHub Actions repo secrets used by the staging verification workflow.

## Existing Logic Checked

- `apps/admin/src/lib/env.ts` only validates presence and URL shape, not whether hosted builds accidentally point at local Supabase values.
- `.github/workflows/staging-admin-verification.yml` already depends on `STAGING_ADMIN_EMAIL` and `STAGING_ADMIN_PASSWORD`, but the repo does not yet list the full Vercel and GitHub secret matrix in one place.
- `apps/admin/.env.example` still reads like a local-only sample and does not clarify hosted expectations.
- There is still no checked-in preflight that tells a future Vercel build “your preview env is incomplete” before Next.js starts building.

## Review Outcome

Build the smallest high-value Vercel setup slice that:

- adds a hosted env preflight script for the admin app
- runs that preflight automatically during build when the app is actually building on Vercel
- makes the required Vercel env vars and GitHub repo secrets explicit in repo docs
- keeps the change admin-scoped and avoids speculative multi-app deployment work before the real Vercel link exists
