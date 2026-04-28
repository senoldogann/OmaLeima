# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-custom-domain-delegation-guidance`
- **Scope:** Post-Phase 6 custom-domain delegation guidance: refine the cutover audit and docs so they distinguish between an external registrar A record and Vercel nameserver delegation, because the Vercel DNS record now exists but is not active yet.

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

- `admin.omaleima.fi` is attached to Vercel now, but public DNS is still empty; switching Supabase Site URL too early would break auth redirects instead of improving them.
- A Vercel DNS record for `admin.omaleima.fi` now exists, but it does nothing until the registrar delegates nameservers to Vercel.
- If the guidance says only “set an A record”, the next operator may miss the equally valid nameserver-delegation path and get stuck in the wrong dashboard.

## Dependencies

- Existing hosted readiness audit, hosted verification workflow, smoke path, and protected-preview bypass support.
- Linked real Vercel project and preview deployment.
- Linked real production deployment on Vercel.
- Added custom domain object `admin.omaleima.fi` under the Vercel project.
- Supabase Auth URL configuration that still points at the preview URL for now.

## Existing Logic Checked

- The production deployment is now `READY`, which removed the earlier Vercel blocker that prevented domain assignment.
- `admin.omaleima.fi` is now attached to the Vercel project, and a Vercel DNS record `admin A 76.76.21.21` has been created inside the Vercel zone.
- Public DNS for `admin.omaleima.fi` is still empty because the domain is not delegated to Vercel nameservers yet, so the domain cannot be used for Supabase Auth cutover yet.
- The current preview URL remains the temporary Supabase Site URL until DNS and Vercel verification finish.

## Review Outcome

Build the smallest delegation-guidance slice that:

- keeps the existing cutover audit and smoke coverage intact
- updates the audit error to mention both valid next paths: registrar A record or Vercel nameserver delegation
- documents that a Vercel DNS record already exists but remains inactive until delegation happens
- leaves the actual Supabase Site URL cutover for the moment when public DNS resolves and Vercel marks the domain verified
