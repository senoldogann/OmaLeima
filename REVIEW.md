# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-supabase-auth-cutover-apply`
- **Scope:** Post-Phase 6 Supabase auth cutover apply slice: prepare a controlled dry-run/apply command for the hosted Supabase Auth URL cutover so the switch is not left as a manual dashboard-only step.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `package.json`
- `tests/run-supabase-auth-cutover-readiness.mjs`
- `apps/admin/package.json`
- `apps/admin/scripts/_shared/supabase-auth-config.ts`
- `apps/admin/scripts/audit-supabase-auth-url-config.ts`
- `apps/admin/scripts/apply-supabase-auth-url-config.ts`
- `apps/admin/scripts/smoke-supabase-auth-url-config-audit.ts`
- `apps/admin/scripts/smoke-supabase-auth-url-config-apply.ts`
- `apps/admin/README.md`
- `docs/TESTING.md`
- `docs/LAUNCH_RUNBOOK.md`

## Risks

- If the apply command can write without checking DNS and current state first, it can break working hosted auth while the custom domain is still dark.
- The write path must not accidentally remove redirect entries that mobile or preview verification still need.
- Hosted writes require a Supabase management token with `auth:write`; failures need to be explicit and safe.

## Dependencies

- Existing custom-domain readiness audit and hosted auth-config audit.
- Hosted Supabase management API access through Supabase CLI login or `SUPABASE_ACCESS_TOKEN`.
- The current hosted Supabase auth config, which already includes preview, custom-domain, mobile, and Expo web redirect URLs plus Google OAuth enablement.
- The still-pending DNS cutover for `admin.omaleima.fi`.

## Existing Logic Checked

- `apps/admin/scripts/audit-custom-domain-cutover.ts` already tells us when Vercel and DNS are ready.
- `apps/admin/scripts/audit-supabase-auth-url-config.ts` already tells us whether hosted Supabase Auth is still in preview-mode or has moved to custom-domain-mode.
- The real hosted auth config currently reports:
  - `site_url = https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app`
  - redirect allow-list includes preview callback, custom-domain callback, mobile deep link, Expo web callback, and preview wildcard
  - Google OAuth is enabled with a real client id
- That current preview-mode state is valid for now, but we still do not have a repo-owned command that can safely apply the later switch to `https://admin.omaleima.fi`.

## Review Outcome

Build the smallest Supabase-auth apply slice that:

- extracts the common hosted Supabase auth config access into a shared helper
- adds a dry-run/apply command with explicit target states instead of manual dashboard steps
- blocks apply unless the current state and target state make sense
- reuses the existing DNS/custom-domain audit as a gate before custom-domain apply
- adds deterministic smoke coverage without writing to the real hosted project
