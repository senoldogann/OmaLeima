# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/admin-web-foundation`
- **Scope:** Phase 5 admin and club web foundation with real Next.js app shell, Supabase SSR auth, and role-gated dashboards.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/admin/*`
- `docs/*`

## Risks

- Server-side auth must not trust spoofable session cookies alone; protected route access has to be based on `getClaims()` plus profile lookup.
- Role routing must not accidentally send students or business staff into admin or club surfaces.
- The new web app must not quietly drift into a dead boilerplate scaffold with no real auth or dashboard structure.
- CI and test posture is still thin at repo level, so this slice should at least leave clear app-local validation scripts and smoke paths.
- GTM/deployment expectations for a second app surface should be documented enough that Vercel or Cloudflare onboarding is obvious later.

## Dependencies

- Existing Supabase Auth project and seeded `profiles` rows for `PLATFORM_ADMIN`, `CLUB_ORGANIZER`, `BUSINESS_STAFF`, and `STUDENT`.
- Existing repo convention of `apps/*` for app surfaces.
- Official Next.js App Router and Supabase SSR patterns verified from current docs.

## Existing Logic Checked

- No admin web app exists yet; Phase 5 has to start from zero under `apps/admin`.
- Mobile already has a session access resolver pattern that can be adapted to web role routing.
- Master plan already defines `/admin` and club organizer scope, so the first slice should align to those routes instead of inventing a new IA.
- Repo does not yet have a dedicated CI flow for the admin app, so local lint/build/smoke must be explicit.

## Review Outcome

Create `apps/admin`, add Supabase SSR auth utilities plus role-gated root routing, ship real `/login`, `/admin`, and `/club` surfaces, and document how this web app will later plug into stronger CI, RLS smoke, load testing, and go-to-market deployment work.
