# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/pilot-operator-hygiene-audit`
- **Goal:** Add a hosted audit gate for fixture operator-account cleanup before a private pilot.

## Architectural Decisions

- Follow the existing hosted-audit pattern under `apps/admin/scripts`.
- Use Supabase CLI to read a hosted service-role key instead of asking the owner to copy secrets into the repo.
- Query hosted auth users plus hosted `profiles`, `business_staff`, and `club_members` in read-only mode.
- Treat known fixture emails and any active privileged memberships attached to them as a readiness failure.

## Alternatives Considered

- Leaving operator cleanup as a manual checklist item only:
  - rejected because the hosted project can drift and we need a repeatable gate before a real pilot
- Reading only docs and env names without touching hosted data:
  - rejected because the actual risk is stale fixture users still existing in hosted auth and memberships
- Mutating or auto-disabling fixture users from the audit:
  - rejected because this slice should stay read-only and safe

## Edge Cases

- Hosted projects with no users or no privileged memberships should still produce a clear `READY` result.
- The audit should not fail just because student smoke users exist; the important part is privileged operator cleanup.
- Legacy service-role and newer secret-key listings may both appear in CLI output, so key selection should be explicit.

## Validation Plan

- Update the working docs.
- Add the hosted audit script, deterministic smoke, and root QA wrapper.
- Run `npm --prefix apps/admin run lint`.
- Run `npm --prefix apps/admin run typecheck`.
- Run `npm --prefix apps/admin run smoke:pilot-operator-hygiene-audit`.
- Run `npm run qa:pilot-operator-readiness`.
- Run the real hosted audit once and record the current blocker honestly.
