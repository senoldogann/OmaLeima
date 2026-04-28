# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-hosted-live-verification`
- **Goal:** Close the real hosted verification loop by bringing the linked Supabase project to the expected schema state, provisioning the hosted admin verification secrets, and proving the protected preview smoke passes end to end.

## Architectural Decisions

- Keep the already-created real Vercel project and hosted public env vars as-is; this slice is about making the hosted verification path actually live.
- Treat the linked hosted Supabase project as a first-class deployment target and push the full migration set before any hosted auth smoke is trusted.
- Keep the hosted admin verification account password-based for now because `smoke:hosted-admin-access` tests the real password route.
- Generate a Vercel protection bypass secret explicitly and store it in GitHub Actions as `VERCEL_AUTOMATION_BYPASS_SECRET`.
- Use one real hosted admin identity for staging verification:
  - `admin@omaleima.test`
- Record the remote-schema bootstrap requirement in the launch runbook so the next hosted project does not fail late for the same reason.

## Alternatives Considered

- Skipping hosted schema push and creating only auth credentials:
  - rejected because the admin app requires `profiles` and other public tables, not just auth users
- Creating a Google-only hosted admin account:
  - rejected because the current staging smoke validates the password sign-in path
- Disabling preview protection:
  - rejected because the project already supports the protected-preview header path and we want the real workflow to use it

## Edge Cases

- The linked hosted project may be reachable by Auth but still missing PostgREST schema cache for the public tables; verify both auth and public tables before trusting the environment.
- A pre-existing hosted admin auth user may already exist; update password and ensure the `profiles` row is still `PLATFORM_ADMIN` instead of assuming a clean create.
- The preview domain should not be mistaken for the final production domain; docs need to keep the later custom-domain cutover explicit.
- Hosted verification should fail loudly if any of the three GitHub secrets are missing, even after the local smoke path has already passed.

## Validation Plan

- Apply the current migration set to the linked hosted Supabase project.
- Provision or update the hosted admin account and set the three GitHub Actions secrets.
- Run `npm --prefix apps/admin run audit:hosted-setup`.
- Run `ADMIN_APP_BASE_URL=... npm run qa:staging-admin-verification` against the real preview URL with the bypass secret.
- Verify the hosted `profiles` table and the hosted admin row directly through the hosted API.
- Update `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, `TODOS.md`, and the launch runbook with the now-proven hosted bootstrap path.
