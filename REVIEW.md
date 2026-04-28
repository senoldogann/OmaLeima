# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-custom-domain-cutover-readiness`
- **Scope:** Post-Phase 6 custom-domain cutover readiness: verify the production deployment and custom domain are in a state where Supabase Auth can later move from the preview URL to `admin.omaleima.fi`, while capturing the current DNS blocker in a replayable audit.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `package.json`
- `tests/run-custom-domain-readiness.mjs`
- `apps/admin/package.json`
- `apps/admin/scripts/audit-custom-domain-cutover.ts`
- `apps/admin/scripts/smoke-custom-domain-cutover-audit.ts`
- `apps/admin/README.md`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`

## Risks

- `admin.omaleima.fi` is attached to Vercel now, but DNS is still empty; switching Supabase Site URL too early would break auth redirects instead of improving them.
- The latest production deployment used to be errored, and Vercel refuses domain assignment in that state. We need to keep production readiness and domain readiness coupled in the audit.
- The team can lose track of whether the remaining blocker is Vercel, DNS, or Supabase dashboard cutover unless the audit names the exact missing step.

## Dependencies

- Existing hosted readiness audit, hosted verification workflow, smoke path, and protected-preview bypass support.
- Linked real Vercel project and preview deployment.
- Linked real production deployment on Vercel.
- Added custom domain object `admin.omaleima.fi` under the Vercel project.
- Supabase Auth URL configuration that still points at the preview URL for now.

## Existing Logic Checked

- The production deployment is now `READY`, which removed the earlier Vercel blocker that prevented domain assignment.
- `admin.omaleima.fi` is now attached to the Vercel project, but Vercel still reports it as misconfigured and asks for `A admin.omaleima.fi 76.76.21.21`.
- Public DNS for `admin.omaleima.fi` is still empty, so the domain cannot be used for Supabase Auth cutover yet.
- The current preview URL remains the temporary Supabase Site URL until DNS and Vercel verification finish.

## Review Outcome

Build the smallest cutover-readiness slice that:

- captures custom-domain readiness in a replayable audit script
- proves the audit handles production-not-ready, DNS-pending, and ready states
- documents the exact current blocker: DNS still needs `A admin.omaleima.fi 76.76.21.21`
- leaves the actual Supabase Site URL cutover for the moment when the domain resolves and Vercel marks it verified
