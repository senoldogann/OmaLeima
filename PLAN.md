# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `chore/full-role-review-handoff`
- **Goal:** Keep the project handoff truthful after the latest static role review and validation gates.

## Architectural Decisions

- Do not add new schema or UI changes without a concrete defect; the latest static review did not reveal a safe code fix to make.
- Record which older report findings have already been fixed so future agents do not repeat stale work.
- Keep physical iOS reinstall and media smoke as explicit blockers instead of pretending automated checks cover them.
- Use existing `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, and `TODOS.md` rather than creating another standalone report.

## Edge Cases

- User-local files remain outside commits: `apps/mobile/package.json`, `RAPOR.md`, and `apps/mobile/src/app/student/events/.idea/`.
- Supabase lint validates schema shape and policies, but it does not replace live role smoke testing.
- Expo web export validates route registration, but it does not validate native camera permission strings on installed iOS builds.

## Validation Plan

- Record validation evidence:
  - `npm --prefix apps/admin run typecheck`
  - `npm --prefix apps/admin run lint`
  - `supabase db lint --linked`
  - prior mobile `typecheck`, `lint`, and `export:web` from the latest merged mobile slices
  - `xcrun xctrace list devices`
- Run `git --no-pager diff --check`.
- Update `PROGRESS.md`.
