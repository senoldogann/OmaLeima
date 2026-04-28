# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-supabase-auth-cutover-apply`
- **Goal:** Add a controlled dry-run/apply command for the hosted Supabase Auth URL cutover so the eventual switch is scripted, state-aware, and reversible.

## Architectural Decisions

- Reuse the Supabase management API for both read and write, but keep real hosted validation on `dry-run` only for this slice.
- Extract common hosted auth-config access into a shared helper used by both the audit and the new apply command.
- Treat two site URL states as valid:
  - preview-mode: `https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app`
  - custom-domain-mode: `https://admin.omaleima.fi`
- Keep the canonical redirect allow-list identical across both modes; only `site_url` changes.
- Require explicit target modes in the new command:
  - `preview`
  - `custom-domain`
- Require `custom-domain` apply to pass the custom-domain readiness audit first.

## Alternatives Considered

- Leaving the final switch as dashboard-only:
  - rejected because it remains easy to drift and hard to review
- Writing directly from `supabase/config.toml` with `supabase config push`:
  - rejected because this repo's local config is for localhost development, not the hosted auth surface
- Adding a write command with no dry-run:
  - rejected because we want a safe rehearsal path before the real DNS window

## Edge Cases

- Hosted auth config can already contain the custom-domain redirect while `site_url` is still preview-mode; the apply command should not try to “clean” that away.
- Applying `preview` while already in preview-mode or `custom-domain` while already in custom-domain-mode should fail clearly rather than silently writing.
- The management token may only be available via the Supabase CLI keychain on macOS; fail with a precise message if neither keychain nor `SUPABASE_ACCESS_TOKEN` is available.
- If Google OAuth is disabled or the redirect allow-list is already damaged, the command should stop and point back to the audit instead of patching over an unknown state.

## Validation Plan

- Add `apply:supabase-auth-url-config` and `smoke:supabase-auth-url-config-apply`.
- Keep the existing audit and add a small shared helper under `apps/admin/scripts/_shared`.
- Run lint, typecheck, the new apply smoke, and one real hosted dry-run against the current preview-mode config.
- Update `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, `TODOS.md`, `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md` with the new cutover command.
