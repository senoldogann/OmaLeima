# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/phase-6-hardening-foundation`
- **Scope:** Phase 6 QA foundation with centralized smoke orchestration and core RLS regression coverage.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `README.md`
- `apps/admin/README.md`
- `apps/admin/package.json`
- `apps/admin/scripts/*`
- `docs/TESTING.md`
- `tests/*`
- root `package.json`

## Risks

- Current smoke coverage is strong but fragmented. A future agent can easily miss a required sequence or prerequisite and think the repo is healthier than it is.
- Repo-level QA still depends on manual knowledge: which scripts need a running admin app, which ones need Docker-backed DB access, and which ones depend on local Edge Functions.
- Critical RLS expectations are currently proven indirectly across many feature smokes, but there is no single focused regression script for the most security-sensitive direct table access rules.
- If the new orchestration script assumes too much local state, it becomes flaky and adds noise instead of trust.
- We should not overreach into full concurrency or load harnesses in the same slice. The first hardening step needs a reliable foundation, not a broad half-finished QA suite.

## Dependencies

- Existing admin smoke scripts in `apps/admin/scripts`.
- Existing local Supabase reset flow and seeded accounts.
- Existing RLS policies on `stamps`, `reward_claims`, `audit_logs`, `department_tags`, and related tables.
- Existing feature-level docs in `apps/admin/README.md` and `docs/DATABASE.md`.

## Existing Logic Checked

- Admin app already has focused route and flow smokes for business applications, oversight, department tags, club events, club rewards, club claims, and club department tags.
- Many direct-write RLS expectations are already tested, but each script only covers its own slice.
- There is no root-level package or single QA entry point right now.
- The master plan explicitly calls for `tests/` outputs and `docs/TESTING.md` in Phase 6.

## Review Outcome

Build a first Phase 6 hardening slice that:

- adds a single repo-level QA entry point
- documents prerequisites and smoke tiers clearly
- adds a dedicated core RLS regression script
- keeps the scope tight enough to be stable and repeatable
