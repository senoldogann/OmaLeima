# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/private-pilot-final-dry-run`
- **Goal:** Turn the final hosted private-pilot dry-run into a repo-owned command that proves the current operator credential set still works.

## Architectural Decisions

- Add one focused dry-run script under `apps/admin/scripts`.
- Read the current operator credentials from the Desktop file instead of duplicating them into repo env files.
- Reuse hosted key lookup helpers so the script can obtain both publishable and service-role keys from the CLI.
- Authenticate all three operator accounts with the publishable key, then verify role and active access shape through a mix of signed-user reads and service-role inspection.
- Keep the script read-only; it should fail with actionable output instead of auto-repairing hosted state.

## Alternatives Considered

- Leaving the final dry-run as a manual human checklist only:
  - rejected because we want one command that can quickly tell us whether the current credential file and hosted access shape are still in sync
- Reading passwords from repo env files:
  - rejected because the current source of truth is the Desktop credential file and we do not want another secret copy
- Verifying only password sign-in without checking memberships:
  - rejected because a successful login alone does not prove organizer/scanner access still exists

## Edge Cases

- The Desktop credential file may be missing or manually edited; parsing and validation should fail loudly.
- The hosted project may have more than one organizer or scanner membership later; the dry-run should only prove that the current operator account still has at least one active privileged membership.
- Admin password auth can succeed even if route-level verification is broken, so we should keep the existing hosted admin browser smoke as a separate gate.

## Validation Plan

- Update the working docs.
- Add the hosted final dry-run script and a root wrapper.
- Run `npm --prefix apps/admin run lint`.
- Run `npm --prefix apps/admin run typecheck`.
- Run the real hosted final dry-run against the current Desktop credential file.
- Keep `npm --prefix apps/admin run audit:pilot-operator-hygiene` green.
- Update launch docs and handoff notes with the new command and owner guidance.
