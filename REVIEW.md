# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `bug/supabase-auth-cutover-hardening`
- **Scope:** Hardening follow-up for the Supabase auth cutover apply flow: fix reviewer findings, preserve extra redirect URLs, add retry behavior, and document that the future custom domain stays parked until a real domain is purchased.

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

- The current apply flow can accidentally remove valid extra redirect URLs if it rewrites the allow-list too aggressively.
- A single transient `429/5xx` or a slightly stale read-after-write can make an operator-facing cutover command look failed even when Supabase eventually applied it.
- The smoke must verify the outgoing PATCH payload, not just the printed success line.

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
- The current preview-mode state is valid for now, and the new apply command exists, but the reviewer found three real issues in its first version:
  - it could delete extra redirect URLs
  - it had no retry behavior for transient remote failures
  - its smoke never asserted the actual PATCH payload

## Review Outcome

Build the smallest hardening slice that:

- preserves any existing extra hosted redirect URLs while still guaranteeing the required ones
- adds retry behavior and read-after-write verification retries for transient Supabase management API failures
- makes the apply smoke assert the exact PATCH payload
- leaves the future domain work parked until a real domain is bought
