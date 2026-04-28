# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/phase-6-concurrency-and-jwt-hardening`
- **Goal:** Extend Phase 6 with explicit function-backed QR/JWT abuse coverage and a duplicate-scan race harness.

## Architectural Decisions

- Keep the function-backed smokes in `apps/admin/scripts/` for now so they can reuse `tsx`, `@supabase/supabase-js`, and the existing smoke style.
- Add one script for QR/JWT abuse assertions and one script for duplicate-scan concurrency assertions. Keep them separate so failures tell us exactly which layer broke.
- Use deterministic SQL fixtures for isolated event and scanner data instead of mutating the seeded event forever.
- Add a root-level expanded QA runner in `tests/` that:
  1. preflights the admin app
  2. preflights the local function server
  3. runs `qa:phase6-core`
  4. runs function-backed smokes after the core matrix
- Keep the expanded matrix narrow in this slice:
  1. existing business-application review smoke
  2. new QR/JWT security smoke
  3. new scan race smoke

## Alternatives Considered

- Writing these checks as pure shell scripts: rejected because token signing, concurrent request handling, and typed auth helpers are clearer in TypeScript.
- Reusing seeded event data directly for race tests: rejected because it makes reruns flaky and hides whether cleanup is working.
- Bundling JWT abuse and race checks into one large script: rejected because failures would be harder to diagnose and reviewer feedback would be noisier.
- Jumping straight to leaderboard load or cron load in the same slice: rejected because QR security and replay protection are the higher-risk open items from the Phase 6 checklist.

## Edge Cases

- The local function server may not be running even while the Supabase stack is up; the expanded matrix must fail early with a clear message.
- Invalid JWT tests must distinguish tampered signature, expired token, and wrong QR type instead of collapsing them all into one generic invalid result.
- Wrong-event QR abuse needs a valid signed token for an event where the scanner business is not joined; otherwise the smoke would only prove invalid signing, not venue scoping.
- The duplicate-scan race test must verify side effects in `stamps`, `qr_token_uses`, and `audit_logs`, not only response bodies.
- Extra scanner fixture users and event rows must be cleaned up fully so repeated runs remain stable.

## Validation Plan

- Run direct function-backed validation while developing:
  1. `rtk supabase db reset --yes`
  2. `rtk supabase functions serve --env-file supabase/.env.local`
  3. `cd apps/admin && rtk npm run smoke:qr-security`
  4. `cd apps/admin && rtk npm run smoke:scan-race`
- Run full matrix validation:
  1. `rtk npm run qa:phase6-expanded`
  2. `rtk npm run qa:phase6-core`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`, `README.md`, `apps/admin/README.md`, `docs/EDGE_FUNCTIONS.md`, and `docs/TESTING.md`.
