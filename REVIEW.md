# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/private-pilot-final-dry-run`
- **Scope:** Add a repo-owned final hosted dry-run gate that uses the generated pilot operator accounts and proves the current private-pilot credential set still works.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `README.md`
- `docs/LAUNCH_RUNBOOK.md`
- `docs/TESTING.md`
- `apps/admin/package.json`
- `apps/admin/README.md`
- `apps/admin/scripts/_shared/hosted-project-admin.ts`
- `apps/admin/scripts/run-pilot-final-dry-run.ts`
- `tests/run-private-pilot-final-dry-run.mjs`

## Risks

- The dry-run should not mutate hosted pilot data. It should authenticate and read only what is needed to prove access.
- The Desktop credential file is secret material. The script must read it without copying passwords back into the repo.
- The gate should fail clearly when the Desktop file is missing or stale, otherwise the owner will not know what to fix.

## Dependencies

- Hosted project ref and Supabase CLI auth
- `supabase projects api-keys` to read publishable and service-role keys for hosted inspection
- `@supabase/supabase-js` already present in `apps/admin`
- Current launch guidance in `README.md`, `docs/LAUNCH_RUNBOOK.md`, and `docs/TESTING.md`
- The local Desktop operator credential file at `/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt`

## Existing Logic Checked

- The hosted hygiene audit is now green, so the next useful proof is whether the current operator credentials still authenticate and still map to the expected roles.
- Existing hosted helper logic already knows how to read hosted keys through the Supabase CLI.
- Existing docs already say a final private-pilot dry-run is required, but there is no repo-owned command for it yet.

## Review Outcome

Ship a narrow private-pilot readiness follow-up that:

- reads the Desktop operator credential file
- signs in the admin, organizer, and scanner accounts against the hosted project
- verifies the expected hosted role and active access shape for each account
- exposes the result through a repeatable root command and owner-facing docs
