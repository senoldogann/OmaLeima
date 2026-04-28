# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-supabase-auth-cutover-audit`
- **Goal:** Add a repo-owned read-only audit for hosted Supabase Auth URL config so we can verify preview-mode now and custom-domain-mode later without guessing from the dashboard.

## Architectural Decisions

- Keep this slice read-only; use the Supabase management API to inspect auth config, not to patch it yet.
- Reuse the same audit/smoke pattern used by the hosted and custom-domain audits.
- Treat two site URL states as valid:
  - preview-mode: `https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app`
  - custom-domain-mode: `https://admin.omaleima.fi`
- Require the full redirect allow-list and Google OAuth enablement in both modes so the cutover does not regress mobile or web sign-in.

## Alternatives Considered

- Relying on the Supabase dashboard by hand:
  - rejected because the current state would stay invisible to the repo and easy to drift
- Adding a write command first:
  - rejected for this slice because DNS is still red and the first need is safe visibility
- Folding this logic into the existing custom-domain audit:
  - rejected because Vercel/DNS readiness and Supabase auth state are different checkpoints

## Edge Cases

- Hosted auth config can already contain the custom-domain redirect while `site_url` is still preview-mode; that should pass.
- Google OAuth can be disabled or lose its client id while URL values still look right; the audit should fail on that.
- The management token may only be available via the Supabase CLI keychain on macOS; fail with a precise message if neither keychain nor `SUPABASE_ACCESS_TOKEN` is available.
- After the eventual cutover, preview callback URLs may still remain in the allow-list; that should not be treated as an error.

## Validation Plan

- Add `audit:supabase-auth-url-config` and `smoke:supabase-auth-url-config-audit`.
- Add a repo-root `qa:supabase-auth-cutover-readiness` wrapper.
- Run lint, typecheck, the new smoke, and one real hosted audit against the current preview-mode config.
- Update `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, `TODOS.md`, `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md` with the new read-only checkpoint.
