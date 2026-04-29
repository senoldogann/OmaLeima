# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/pilot-secret-hygiene-audit`
- **Scope:** Add a repo-owned secret and password hygiene gate for the current hosted pilot credential set.

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
- `apps/admin/scripts/_shared/pilot-operator-credentials.ts`
- `apps/admin/scripts/audit-pilot-secret-hygiene.ts`
- `apps/admin/scripts/smoke-pilot-secret-hygiene-audit.ts`
- `apps/admin/scripts/run-pilot-final-dry-run.ts`
- `package.json`
- `tests/run-pilot-secret-hygiene.mjs`

## Risks

- The Desktop credential file is secret material. The audit must inspect it without copying secrets into repo files or logs.
- GitHub Actions secret values are not readable, so the audit can only prove presence, not exact value equality.
- A false-green hygiene gate would be worse than none; failures must be explicit about file permissions, weak passwords, or missing secret names.

## Dependencies

- The local Desktop operator credential file at `/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt`
- GitHub CLI auth to inspect repo secret names
- Current launch guidance in `README.md`, `docs/LAUNCH_RUNBOOK.md`, and `docs/TESTING.md`

## Existing Logic Checked

- The hosted final dry-run is now green, so the next useful gate is whether the current local credential file still looks safe enough for a pilot handoff.
- The project already has a Desktop credential file as the current source of truth for operator passwords.
- Current docs mention moving the file somewhere safer, but there is no repeatable audit for permissions, weak passwords, or missing GitHub secret names.

## Review Outcome

Ship a narrow secret-hygiene follow-up that:

- reuses the Desktop credential parser in one shared helper
- audits credential-file permissions, password quality, and duplicate passwords
- audits the required GitHub secret names for the pilot path
- exposes the result through a repeatable root command and owner-facing docs
