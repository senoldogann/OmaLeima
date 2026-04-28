# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/phase-6-hardening-foundation`
- **Goal:** Open Phase 6 with a reliable QA entry point, core RLS regression coverage, and explicit testing docs.

## Architectural Decisions

- Add a root-level `package.json` for QA orchestration only. The repo currently has no single command surface, and Phase 6 needs one.
- Keep orchestration in `tests/` to match the master plan output instead of burying it inside one app.
- Use a small Node script in `tests/` that shells out to existing commands. This avoids duplicating smoke logic and keeps each feature-level smoke where it already belongs.
- Introduce a dedicated `apps/admin/scripts/smoke-rls-core.ts` script for cross-cutting direct-access security assertions.
- Make the first matrix intentionally scoped:
  1. reset local DB
  2. admin lint + typecheck + build
  3. core auth and route smokes
  4. core admin and club feature smokes
  5. dedicated RLS regression smoke
- Document two tiers:
  1. core matrix that does not require local Edge Functions
  2. expanded matrix that includes function-backed smokes once that layer is centralized later

## Alternatives Considered

- Moving all smokes into one giant new script: rejected because it would duplicate proven slice-level scripts and become harder to maintain.
- Starting with concurrency/load harness first: rejected because the repo still lacks a stable single QA entry point and dedicated RLS regression set.
- Adding GitHub Actions immediately in the same slice: rejected for now. First we need a clean local foundation to automate later.
- Writing the orchestrator in bash only: workable, but a small Node runner gives clearer preflight checks and is easier to extend.

## Edge Cases

- The local admin app may not be running; the matrix must fail early with a clear message.
- Some smokes rely on Docker-backed DB access; docs must say that explicitly.
- Some smokes rely on seeded accounts and `supabase db reset`; the matrix must own that reset step.
- The dedicated RLS smoke must avoid colliding with feature-specific fixture data and must clean up after itself.
- The new root package must not interfere with `apps/admin` or `apps/mobile` dependency management.

## Validation Plan

- Run root and admin validation:
  1. `npm run qa:phase6-core`
  2. `cd apps/admin && npm run smoke:rls-core`
- Also run direct commands while developing:
  1. `rtk supabase db reset`
  2. `cd apps/admin && rtk npm run lint`
  3. `cd apps/admin && rtk npm run typecheck`
  4. `cd apps/admin && rtk npm run build`
  5. `cd apps/admin && rtk npm run smoke:auth`
  6. `cd apps/admin && rtk npm run smoke:routes`
  7. `cd apps/admin && rtk npm run smoke:oversight`
  8. `cd apps/admin && rtk npm run smoke:department-tags`
  9. `cd apps/admin && rtk npm run smoke:club-events`
  10. `cd apps/admin && rtk npm run smoke:club-rewards`
  11. `cd apps/admin && rtk npm run smoke:club-claims`
  12. `cd apps/admin && rtk npm run smoke:club-department-tags`
  13. `cd apps/admin && rtk npm run smoke:rls-core`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`, `README.md`, `apps/admin/README.md`, and `docs/TESTING.md`.
