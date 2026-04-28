# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-hosted-verification-unblock`
- **Scope:** Post-Phase 6 hosted-admin verification unblock: add Vercel protection-bypass support to the hosted verification path, make the readiness audit conditional on preview protection, and record the temporary preview-domain Site URL decision until the custom domain lands.

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
- `.github/workflows/*`
- root `package.json`
- `tests/*`

## Risks

- The hosted verification script currently assumes an anonymous preview URL is reachable; on the real Vercel project this is false because preview deployments are behind SSO protection.
- If we wire bypass handling only into the workflow but not into the local hosted smoke script, we will still have a split-brain verification path.
- The readiness audit currently treats all missing GitHub secrets the same, but a protected preview needs one additional secret for automation access.
- The temporary preview URL is now acting as the effective Site URL until the real domain exists; we should note that clearly so the later domain cutover is intentional.

## Dependencies

- Existing admin env parsing in `apps/admin/src/lib/env.ts`.
- Existing hosted readiness audit, hosted verification workflow, smoke path, and prebuild env check.
- Existing admin README, root README, testing docs, and launch runbook.
- Vercel protection-bypass automation behavior.
- Existing real Vercel project and preview deployment.
- GitHub Actions repository secrets used by the staging verification workflow.

## Existing Logic Checked

- `apps/admin/scripts/smoke-hosted-admin-access.ts` and `_shared/browser-smoke.ts` do not currently know how to bypass Vercel preview protection.
- `.github/workflows/staging-admin-verification.yml` does not pass any bypass secret into the hosted smoke.
- `apps/admin/scripts/audit-hosted-setup.ts` currently asks only for `STAGING_ADMIN_EMAIL` and `STAGING_ADMIN_PASSWORD`, even though the real preview project has `ssoProtection`.
- The current real preview URL is temporary and should be treated as a staging placeholder until `admin.omaleima.fi` exists.

## Review Outcome

Build the smallest high-value hosted-verification-unblock slice that:

- adds optional `VERCEL_AUTOMATION_BYPASS_SECRET` support to the hosted smoke path
- makes the hosted readiness audit require that secret when preview protection is active
- passes the bypass secret through the GitHub workflow
- records that the preview domain is a temporary Site URL placeholder until the custom domain is ready
