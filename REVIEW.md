# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-real-vercel-project-link`
- **Scope:** Post-Phase 6 real hosted-admin provisioning for the admin panel: create or link the actual Vercel project, set real Preview and Production env vars, and wire GitHub staging-verification secrets only if the hosted admin account is confirmed.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/package.json`
- `apps/admin/scripts/*`
- `apps/admin/README.md`
- `apps/admin/vercel.json`
- `README.md`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`
- `.vercel/*` under `apps/admin` if a real link is created locally
- root `package.json`
- `tests/*`

## Risks

- Creating the wrong Vercel project or linking the wrong scope would waste the next deploy cycle and muddy the hosted audit.
- Setting GitHub staging secrets before we prove the hosted Supabase project accepts the intended admin credentials would create a false-ready workflow.
- `.vercel/project.json` is local operational state; we must avoid committing it while still using it to drive the audit.
- Real Vercel env writes are mutable external state; we need to verify after each step instead of assuming the CLI call stuck.
- If the hosted Supabase project does not contain the expected admin auth user, the next correct move is to stop at Vercel env provisioning and document the auth gap clearly.
- A Vercel project created with the wrong preset can still fail even after link and env provisioning; we need a repo-owned framework override so future deploys do not depend on dashboard defaults.

## Dependencies

- Existing admin env parsing in `apps/admin/src/lib/env.ts`.
- Existing hosted readiness audit, hosted verification workflow, smoke path, and prebuild env check.
- Existing admin README, root README, testing docs, and launch runbook.
- Vercel CLI auth, project creation/linking behavior, and env management.
- Supabase hosted project metadata and publishable keys from MCP.
- GitHub Actions repository secrets used by the staging verification workflow.

## Existing Logic Checked

- `apps/admin/scripts/audit-hosted-setup.ts` now gives us the missing upstream gap, but the repo still has no real `apps/admin` Vercel link.
- `vercel project list` in the current personal scope shows no existing OmaLeima project yet.
- Supabase MCP shows one active hosted project named `OmaLeima` with a real hosted URL and a non-disabled publishable key, so admin public env provisioning is now unblocked.
- GitHub Actions secrets are still absent, and we should only set them after a hosted admin sign-in path is verified or intentionally accepted.
- A real preview deploy reached Next build successfully, then failed because the Vercel project was created with Framework Preset `Other` and Output Directory `public`. The cleanest fix is a committed `apps/admin/vercel.json` with `framework: nextjs`.

## Review Outcome

Build the smallest high-value real-hosting slice that:

- creates or links the real admin Vercel project in the current scope
- provisions real Preview and Production admin public env vars from the hosted Supabase project
- pins the admin deployment framework in repo config so Vercel does not depend on a wrong dashboard preset
- verifies the hosted readiness audit advances past link/env checks
- sets GitHub staging secrets only if the hosted admin credential path is proven valid
