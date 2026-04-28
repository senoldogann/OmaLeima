# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-custom-domain-delegation-guidance`
- **Goal:** Refine the custom-domain cutover guidance so the audit and docs clearly explain the two valid ways forward: add the external A record or delegate the domain to Vercel nameservers.

## Architectural Decisions

- Keep the current hosted-preview verification path untouched; this slice is only about making the external DNS instruction unambiguous.
- Reuse the existing custom-domain audit rather than adding another audit layer.
- Teach the audit to mention both external-DNS options when the domain is still misconfigured:
  - add `A admin.omaleima.fi 76.76.21.21` at the current DNS provider
  - or switch nameservers to `ns1.vercel-dns.com`, `ns2.vercel-dns.com` so the existing Vercel DNS record becomes active
- Update docs to state that the Vercel DNS record already exists inside the Vercel zone.

## Alternatives Considered

- Leaving the audit error as “set the A record” only:
  - rejected because the domain now also has a Vercel DNS path and the operator should see both choices
- Trying to automate registrar nameserver changes from this repo:
  - rejected because we do not have registrar control here
- Starting the Supabase Auth cutover before public DNS resolves:
  - rejected because it would break the current working hosted auth path

## Edge Cases

- The Vercel zone can contain the right DNS record while the public internet still resolves nothing; the audit message should say why.
- Production can regress later; keep the production readiness check untouched.
- The domain can resolve to multiple A values; if `76.76.21.21` is not present, keep the cutover blocked.
- When the domain eventually turns green, the next step is operational cutover in Supabase and Google OAuth settings, not another code change first.

## Validation Plan

- Update the existing custom-domain audit error guidance and keep the smoke passing.
- Run lint, typecheck, `smoke:custom-domain-cutover-audit`, `qa:custom-domain-readiness`, and the real custom-domain audit again.
- Update `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, `TODOS.md`, `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md` with the clarified nameserver-delegation option.
