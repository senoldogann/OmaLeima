# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/pilot-operator-hygiene-audit`
- **Scope:** Add a read-only hosted audit that tells us whether temporary smoke operator accounts are still alive in the hosted project and whether any privileged pilot path still depends on them.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `README.md`
- `docs/LAUNCH_RUNBOOK.md`
- `docs/TESTING.md`
- `package.json`
- `apps/admin/package.json`
- `apps/admin/README.md`
- `apps/admin/scripts/audit-pilot-operator-hygiene.ts`
- `apps/admin/scripts/smoke-pilot-operator-hygiene-audit.ts`
- `tests/run-pilot-operator-readiness.mjs`

## Risks

- The audit should be read-only. It must not mutate hosted users, memberships, or passwords.
- It should fail with concrete fixture emails and membership contexts, not with a generic “not ready” message.
- The script must not rely on local seeded data; it should read the real hosted project.

## Dependencies

- Hosted project ref and Supabase CLI auth
- `supabase projects api-keys` to read a service-role key for hosted inspection
- `@supabase/supabase-js` already present in `apps/admin`
- Current launch guidance in `README.md`, `docs/LAUNCH_RUNBOOK.md`, and `docs/TESTING.md`

## Existing Logic Checked

- The launch docs already say temporary fixture accounts must be removed before a private pilot.
- There is no repo-owned audit yet that checks whether those fixture accounts still exist in hosted auth or still hold active club/business access.
- Existing hosted audits already follow a pattern: one real read-only audit script, one deterministic smoke for the script itself, and one root QA wrapper.

## Review Outcome

Ship a narrow hosted-readiness follow-up that:

- reads the hosted project and finds fixture users by email
- checks whether any such users still hold active privileged memberships
- exposes the result through a real audit, a deterministic smoke, and a root QA wrapper
