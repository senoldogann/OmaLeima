# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `bug/supabase-auth-cutover-hardening`
- **Goal:** Harden the new hosted Supabase auth cutover apply flow so it is safe under review findings and explicitly keeps the custom-domain work parked until later.

## Architectural Decisions

- Keep the existing read/write command shape, but harden the shared helper under it.
- Preserve extra existing redirect URLs; only guarantee the required ones and change `site_url`.
- Add retries with warnings for transient hosted GET/PATCH failures and for read-after-write verification lag.
- Treat two site URL states as valid:
  - preview-mode: `https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app`
  - custom-domain-mode: `https://admin.omaleima.fi`
- Require explicit target modes in the new command:
  - `preview`
  - `custom-domain`
- Require `custom-domain` apply to pass the custom-domain readiness audit first.

## Alternatives Considered

- Leaving the first apply version as-is:
  - rejected because the reviewer found concrete correctness risks
- Stripping all extra redirect URLs to enforce a strict canonical list:
  - rejected because we do not want the cutover helper to silently broaden its blast radius
- Continuing domain work now:
  - rejected because the user explicitly wants domain purchase and final cutover to happen last

## Edge Cases

- Hosted auth config can contain extra valid redirect URLs for future pilot or provider use; keep them.
- Applying `preview` while already in preview-mode or `custom-domain` while already in custom-domain-mode should still fail clearly rather than silently writing.
- The management token may only be available via the Supabase CLI keychain on macOS; fail with a precise message if neither keychain nor `SUPABASE_ACCESS_TOKEN` is available.
- If Google OAuth is disabled or the redirect allow-list is already damaged, the command should still stop and point back to the audit instead of patching over an unknown state.

## Validation Plan

- Harden the shared helper and apply flow.
- Re-run lint, typecheck, both auth smokes, the repo-root auth QA wrapper, the real hosted auth audit, and the real hosted custom-domain dry-run gate.
- Update docs and handoff notes to say the custom-domain target remains a placeholder until the real domain is purchased.
