# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-supabase-auth-cutover-audit`
- **Scope:** Post-Phase 6 Supabase auth cutover audit: add a repo-owned read-only audit for hosted Supabase Auth URL configuration so we can verify preview-mode versus custom-domain-mode before and after DNS cutover.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `package.json`
- `tests/run-supabase-auth-cutover-readiness.mjs`
- `apps/admin/package.json`
- `apps/admin/scripts/audit-supabase-auth-url-config.ts`
- `apps/admin/scripts/smoke-supabase-auth-url-config-audit.ts`
- `apps/admin/README.md`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`

## Risks

- If we keep Supabase Auth URL state only in the dashboard, the cutover can silently drift from repo docs and the next operator will not know whether preview-mode or custom-domain-mode is live.
- Reading hosted auth config requires a Supabase management token; the audit must fail clearly if CLI auth or `SUPABASE_ACCESS_TOKEN` is unavailable.
- We must not trigger any remote write before DNS is ready; this slice should stay read-only and should not mutate hosted auth config.

## Dependencies

- Existing custom-domain readiness audit and hosted verification workflow.
- Hosted Supabase management API access through Supabase CLI login or `SUPABASE_ACCESS_TOKEN`.
- The current hosted Supabase auth config, which already includes preview, custom-domain, mobile, and Expo web redirect URLs plus Google OAuth enablement.
- The still-pending DNS cutover for `admin.omaleima.fi`.

## Existing Logic Checked

- `apps/admin/scripts/audit-custom-domain-cutover.ts` already tells us when Vercel and DNS are ready, but it does not inspect the hosted Supabase auth config itself.
- The real hosted auth config currently reports:
  - `site_url = https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app`
  - redirect allow-list includes preview callback, custom-domain callback, mobile deep link, Expo web callback, and preview wildcard
  - Google OAuth is enabled with a real client id
- That current preview-mode state is valid for now, but we do not yet have a repo-owned audit that can confirm when the switch to `https://admin.omaleima.fi` is complete.

## Review Outcome

Build the smallest Supabase-auth audit slice that:

- adds a read-only hosted auth-config audit under `apps/admin/scripts`
- verifies the current state is either preview-mode or custom-domain-mode, never an unknown URL
- verifies the required redirect URLs and Google OAuth enablement stay present across the cutover
- adds deterministic smoke coverage and a small repo-root QA wrapper
- leaves the actual remote write for the later moment when DNS goes green
