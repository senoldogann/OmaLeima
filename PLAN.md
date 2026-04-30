# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-01
- **Branch:** `feature/push-diagnostics-polish`
- **Goal:** Make the dev-only push diagnostics surface feel intentional instead of user-facing, and fix light-mode lime action contrast across the mobile app.

## Architectural Decisions

- Keep the push diagnostics surface dev-only, but present it as a QA tool row instead of a random secondary button under notifications.
- Add one shared theme token for primary-action foreground color instead of ad hoc per-screen overrides.
- Reuse the existing student/business settings cards and app icon system instead of inventing new settings shells.
- Preserve the working-doc discipline even though this is a small product polish slice.

## Alternatives Considered

- Hide push diagnostics completely:
  - rejected because QA still uses it in dev builds
- Patch button text colors screen by screen with hardcoded black:
  - rejected because a shared theme token is safer and cleaner
- Leave business/profile wording inconsistent:
  - rejected because settings labels should stay shared once we already have shared copy

## Edge Cases

- The QA tool row must stay hidden in production while still being easy to find in dev builds.
- The new primary-action text token must not accidentally affect non-button lime surfaces like avatars or decorative highlights.
- Validation must ignore the known untracked `.idea/` folder and not try to clean it up.

## Validation Plan

- Update `REVIEW.md`, `PLAN.md`, and `TODOS.md` for this polish slice.
- Move the push diagnostics entry into a cleaner dev-only QA row.
- Add a shared primary-action foreground token and apply it to mobile lime buttons.
- Normalize the business support row copy to shared translations.
- Rerun:
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run export:web`
- Document the exact outcome in `PROGRESS.md`.
