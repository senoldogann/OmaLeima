# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/post-phase6-vercel-linking-and-preview-secrets`
- **Goal:** Add repo-owned Vercel env and secret preflight for the admin app so preview and staging builds fail early with clear setup errors.

## Architectural Decisions

- Add one admin-only env preflight script under `apps/admin/scripts/` and run it with `tsx`.
- The preflight should always validate local env shape, but only enforce hosted-safe rules when either:
  1. `VERCEL=1`, or
  2. `REQUIRE_HOSTED_ADMIN_ENV=1`
- Hosted-safe rules should stay narrow and explicit:
  1. `NEXT_PUBLIC_SUPABASE_URL` must be HTTPS
  2. `NEXT_PUBLIC_SUPABASE_URL` must not point to localhost or 127.0.0.1
  3. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must not be an example placeholder
- Run the preflight automatically via admin `prebuild` so real Vercel builds fail before Next.js compile work starts.
- Document the exact config sets separately:
  1. Vercel project env vars for Preview and Production
  2. GitHub repo secrets for the hosted verification workflow
  3. expected Vercel root directory for the admin app (`apps/admin`)

## Alternatives Considered

- Adding generic root-level deployment scripts for the whole monorepo:
  - rejected because the immediate hosted surface is the admin app, and we still do not have a concrete linked Vercel project in view
- Relying on Next runtime zod parsing alone:
  - rejected because it does not distinguish “valid URL string” from “hosted-safe deployment config”
- Adding separate docs for every environment type:
  - rejected because one concise matrix in current docs is enough at this stage
- Blocking all local builds with hosted-safe rules:
  - rejected because local `.env.local` intentionally points at localhost Supabase

## Edge Cases

- Local builds must keep working with `http://127.0.0.1:54321`, so hosted-only checks cannot run unconditionally.
- Custom Vercel environments such as `staging` should be treated the same as hosted preview/production for env safety.
- Placeholder values can vary, so the script should block only obvious example markers instead of inventing format rules for real publishable keys.
- Docs must distinguish Vercel project env vars from GitHub Actions repo secrets; mixing them creates support churn.

## Validation Plan

- Add the admin hosted env preflight script and package.json wiring.
- Validate local-safe mode:
  1. `rtk npm --prefix apps/admin run check:hosted-env`
- Validate hosted-required mode with good values:
  1. `rtk env REQUIRE_HOSTED_ADMIN_ENV=1 NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_realistic_value npm --prefix apps/admin run check:hosted-env`
- Validate hosted-required mode with bad localhost values:
  1. `rtk env REQUIRE_HOSTED_ADMIN_ENV=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_local_or_hosted_key npm --prefix apps/admin run check:hosted-env`
- Run existing admin lint and typecheck after the wiring.
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, `PROGRESS.md`, `README.md`, `apps/admin/.env.example`, `apps/admin/README.md`, `docs/TESTING.md`, and `docs/LAUNCH_RUNBOOK.md`.
