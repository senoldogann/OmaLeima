# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/operator-account-bootstrap`
- **Scope:** Create real hosted operator accounts with strong random passwords, save them to a local Desktop file, reassign hosted pilot access away from fixture accounts, and get the hosted operator-hygiene audit to pass.

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
- `apps/admin/scripts/audit-pilot-operator-hygiene.ts`
- `apps/admin/scripts/bootstrap-pilot-operator-accounts.ts`

## Risks

- The bootstrap flow will mutate the real hosted project, so it must only touch the intended operator accounts and hosted memberships.
- Existing fixture users can still be referenced by old records like events or reviews, so deleting them outright may break foreign-key integrity.
- The generated credentials file must stay outside the repo and must not leak into git.
- Hosted verification flows currently rely on an admin password account, so secret rotation must stay aligned with the new admin credential.

## Dependencies

- Hosted project ref and Supabase CLI auth
- `supabase projects api-keys` to read a service-role key for hosted inspection
- `@supabase/supabase-js` already present in `apps/admin`
- Current launch guidance in `README.md`, `docs/LAUNCH_RUNBOOK.md`, and `docs/TESTING.md`
- GitHub CLI auth if we rotate hosted verification secrets from the same machine

## Existing Logic Checked

- The launch docs already say temporary fixture accounts must be removed before a private pilot.
- The new hosted hygiene audit already tells us exactly which fixture users and memberships are still active.
- Existing hosted helper logic already knows how to read the hosted service-role key through the Supabase CLI.
- The mobile business sign-in and hosted smoke copy still reference seeded hosted credentials directly, so those strings need to become generic before fixture cleanup is complete.

## Review Outcome

Ship a narrow hosted-operator bootstrap follow-up that:

- creates one real hosted admin, one hosted club organizer, and one hosted scanner account
- saves the generated credentials into a Desktop file outside the repo
- reassigns hosted club/business access away from seeded `@omaleima.test` users
- archives seeded hosted operator accounts so the hygiene audit can turn green
