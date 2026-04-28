# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-custom-domain-cutover-readiness`
- **Goal:** Prepare the custom-domain auth cutover by auditing Vercel production readiness, domain attachment, and DNS state in one place before changing Supabase Auth URLs.

## Architectural Decisions

- Keep the current hosted-preview verification path untouched; this slice is only about deciding when the custom domain is safe to cut over.
- Add one new read-only admin audit script for the custom domain, separate from the hosted-auth readiness audit.
- Drive the audit from real Vercel JSON APIs and real DNS resolution instead of brittle dashboard assumptions.
- Fail the audit until three things are true at once:
  - production deployment is ready
  - `admin.omaleima.fi` is attached and verified in Vercel
  - DNS resolves to the Vercel-recommended record
- Document that Supabase Site URL and redirect allow-list should only move after the audit turns green.

## Alternatives Considered

- Editing Supabase Site URL immediately after adding the domain to Vercel:
  - rejected because the domain is still unresolved and would break auth redirects
- Treating the Vercel dashboard warning as enough signal:
  - rejected because we want a replayable CLI audit that the next agent can run
- Bundling custom-domain readiness into the hosted-auth audit:
  - rejected because domain cutover can stay pending even when hosted auth verification is already green

## Edge Cases

- Vercel can have the domain object attached while DNS is still empty; the audit must report that as pending, not ready.
- Production can regress later; the audit should keep checking the production alias instead of assuming the one-time green deploy stays green forever.
- The domain can resolve to multiple A values; if `76.76.21.21` is not present, keep the cutover blocked.
- When the domain eventually turns green, the next step is operational cutover in Supabase and Google OAuth settings, not another code change first.

## Validation Plan

- Add a read-only custom-domain audit script and a deterministic smoke for it.
- Add a repo-root QA wrapper for the deterministic custom-domain audit.
- Run lint, typecheck, `smoke:custom-domain-cutover-audit`, and `qa:custom-domain-readiness`.
- Run the real custom-domain audit and capture the current blocker state.
- Update `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, `TODOS.md`, `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md` with the current DNS instruction and the later Supabase cutover order.
