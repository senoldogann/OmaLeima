# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-hosted-admin-readiness-audit`
- **Goal:** Add a repo-owned hosted-admin readiness audit so the next agent can see, in one command, whether Vercel linking, required Vercel env names, and GitHub Actions secrets are actually ready.

## Architectural Decisions

- Add one admin-only readiness audit script under `apps/admin/scripts/` and run it with `tsx`.
- The audit should verify four concrete things:
  1. Vercel CLI auth works
  2. GitHub CLI auth works
  3. `apps/admin` is linked to a real Vercel project via `.vercel/project.json`
  4. required Vercel Preview/Production env names and GitHub Actions secret names exist
- Use explicit override env vars for the audit so we can smoke-test the script deterministically without depending on a real linked project or real secrets in CI.
- Add a dedicated deterministic smoke script for the audit and a root QA wrapper for it.
- Update docs with the exact commands for:
  1. `vercel link --cwd apps/admin --project <project-name> --yes`
  2. `vercel env add ... preview`
  3. `vercel env add ... production`
  4. `gh secret set ...`

## Alternatives Considered

- Attempting to create or link the real Vercel project automatically from the repo:
  - rejected because the project name, dashboard ownership choice, and secret values are still external decisions
- Relying only on docs and manual checklists:
  - rejected because future agents need a machine-readable readiness signal
- Reusing the existing `check:hosted-env` script for everything:
  - rejected because env-shape validation and upstream hosting readiness are different concerns
- Adding remote mutation coverage to this slice:
  - rejected because the safer next move is read-only readiness and explicit setup commands before any real deploy automation

## Edge Cases

- A future workstation may already have Vercel auth but still have no linked admin project; the error needs to point at `vercel link`, not just say “not ready”.
- A future workstation may have the app linked but be missing Preview or Production env names; the error needs to name the missing variables.
- The repo may have no GitHub Actions secrets yet; the audit should fail with only the missing names, not generic GitHub CLI noise.
- The smoke for this audit must stay deterministic even after the real project is eventually linked, so the test path cannot depend on the current machine state.

## Validation Plan

- Add the admin hosted-readiness audit script and package wiring.
- Add deterministic smoke coverage for the audit script and a root QA wrapper.
- Validate the deterministic smoke:
  1. `rtk npm --prefix apps/admin run smoke:hosted-setup-audit`
  2. `rtk npm run qa:hosted-admin-readiness`
- Validate the real audit against the current workstation and capture the expected missing-link or missing-secret gap:
  1. `rtk npm --prefix apps/admin run audit:hosted-setup`
- Run existing admin lint and typecheck after the wiring.
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`, `README.md`, `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md`.
