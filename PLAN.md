# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-real-vercel-project-link`
- **Goal:** Move the hosted-admin path from repo-only readiness into real external provisioning by linking a real Vercel project, setting real Preview and Production env vars, and pushing the hosted audit forward.

## Architectural Decisions

- Use the real hosted Supabase project values from MCP:
  1. URL: `https://jwhdlcnfhrwdxptmoret.supabase.co`
  2. publishable key: active `sb_publishable_...` key, not the legacy anon key
- Create or reuse a dedicated Vercel project name for the admin app in the current personal scope.
- Link `apps/admin` to that real Vercel project locally without committing `.vercel/project.json`.
- Write the real admin public env vars to both Preview and Production with `vercel env add` or `vercel env update`.
- Add a repo-owned `apps/admin/vercel.json` framework override if the first real deploy shows the project was created with the wrong preset.
- Re-run the hosted readiness audit after each provisioning step so the next missing layer is explicit.
- Probe hosted Supabase password auth for `admin@omaleima.test` / `password123` before writing GitHub staging secrets.
- Only write `STAGING_ADMIN_EMAIL` and `STAGING_ADMIN_PASSWORD` repo secrets if the hosted admin credential path is confirmed valid.

## Alternatives Considered

- Stopping again at docs-only guidance:
  - rejected because we now have enough external access to do the real link/env step
- Writing GitHub staging secrets first:
  - rejected because those secrets are useless or misleading if hosted admin auth still fails
- Using the legacy anon key for Vercel envs:
  - rejected because Supabase now recommends modern publishable keys and the MCP exposed one is active
- Forcing a deploy before link and env provisioning:
  - rejected because the existing prebuild guard would fail immediately and add noise without moving readiness forward

## Edge Cases

- `vercel env add` may fail if the variable already exists; the flow should detect that and switch to `vercel env update` instead of stopping.
- The personal Vercel scope has no OmaLeima project today, so project creation may be part of the slice.
- Hosted Supabase auth may reject the seeded local credentials; that should stop GitHub secret provisioning, not the already useful Vercel link/env work.
- The hosted readiness audit should end this slice either fully green or with one clearly smaller remaining blocker than before.
- The first preview deploy may expose incorrect Vercel project defaults. If so, a repo-owned `vercel.json` override is safer than relying on manual dashboard repair.

## Validation Plan

- Create the real Vercel project if it does not exist, then link `apps/admin`.
- Add or update the real Preview and Production env vars.
- Run a real preview deploy and fix project-preset issues in repo config if they appear.
- Validate hosted Supabase admin password auth with the real hosted URL and publishable key.
- If auth succeeds, set `STAGING_ADMIN_EMAIL` and `STAGING_ADMIN_PASSWORD` repo secrets and re-run the hosted audit.
- Capture the final audit state and update `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, and `TODOS.md`.
