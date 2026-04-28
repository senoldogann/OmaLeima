# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-hosted-live-verification`
- **Scope:** Post-Phase 6 hosted-admin live verification: bring the linked hosted Supabase project to the expected schema state, provision the real hosted admin verification secrets, and confirm the hosted admin smoke passes against the protected preview URL.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/LAUNCH_RUNBOOK.md`

## Risks

- The linked hosted Supabase project may still be effectively empty even when Vercel env wiring is correct; if the remote schema is missing, hosted auth verification will fail for reasons that look like app regressions.
- Provisioning only GitHub secrets without creating a real hosted `PLATFORM_ADMIN` profile leaves the staging smoke path red even though the preview app is deployed.
- The current preview URL is still acting as the temporary Supabase Site URL until the custom domain exists; this needs a controlled later cutover.

## Dependencies

- Existing hosted readiness audit, hosted verification workflow, smoke path, and protected-preview bypass support.
- Linked real Vercel project and preview deployment.
- Linked real hosted Supabase project.
- GitHub Actions repository secrets used by the staging verification workflow.
- Hosted Supabase admin API access through the service-role key.

## Existing Logic Checked

- `apps/admin/scripts/audit-hosted-setup.ts` already verifies the three required GitHub Actions secrets and the protected-preview requirement.
- `apps/admin/scripts/smoke-hosted-admin-access.ts` already supports the bypass header and expects a real password-based hosted admin account.
- The linked hosted Supabase project initially returned `404 PGRST205` for `public.profiles` and `public.clubs`, which means the remote schema had not been applied yet.
- The current real preview URL is temporary and should still be treated as a staging placeholder until `admin.omaleima.fi` exists.

## Review Outcome

Finish the smallest live-verification slice that:

- applies the current migration set to the linked hosted Supabase project
- provisions a real hosted `PLATFORM_ADMIN` account for password-based staging verification
- sets `VERCEL_AUTOMATION_BYPASS_SECRET`, `STAGING_ADMIN_EMAIL`, and `STAGING_ADMIN_PASSWORD` in GitHub Actions secrets
- confirms `audit:hosted-setup` and `qa:staging-admin-verification` pass against the protected preview URL
