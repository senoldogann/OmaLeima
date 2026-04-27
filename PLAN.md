# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-profile-tags`
- **Goal:** Turn the student profile route into the real department-tag management screen while keeping push registration available.

## Architectural Decisions

- Keep the route structure unchanged. `student/profile` already exists and should become the student’s account plus tag-management surface instead of introducing a new tab or nested route.
- Add a dedicated `features/profile` module:
  1. read-model query for profile basics, selected tags, and available active tags
  2. typed mutations for attach, custom create, primary switch, and remove
  3. small presentational components for selected-tag cards and suggestion rows
- Use the existing RLS-backed direct table access for this slice. The new schema foundation already supports self-selected student writes, so we do not need a new Edge Function before shipping the first UI.
- Keep the behavior tight and product-aligned:
  1. official tags appear before custom ones
  2. current tags are shown first
  3. max 3 and max 1 primary remain visible in the UI
  4. the first selected tag becomes primary automatically
  5. removing a primary tag promotes the next remaining tag
- Preserve the existing push-registration surface as a later section on the same screen so this branch completes the profile route instead of displacing prior work.

## Alternatives Considered

- Adding a new backend RPC for create-and-attach now: rejected for this slice because the schema already supports direct student writes and the next missing product step is the profile UI.
- Splitting tags into a separate profile-subscreen: rejected because the current MVP only needs a focused single-screen management flow.
- Showing every active tag as an equal suggestion list: rejected because the roadmap explicitly wants official suggestions first.
- Hiding the push section while building tags: rejected because push registration is already part of the completed profile route and should stay accessible.

## Edge Cases

- Student has no tags yet.
- Student is already at the 3-tag limit.
- Student tries to create a custom tag that already exists as an official or user-created active tag.
- Student changes primary tag while another mutation is in flight.
- Student removes the current primary tag and still has at least one remaining tag.
- Student removes the last remaining tag.
- Server rejects a mutation because another device changed the same profile state first.

## Validation Plan

- Run `apps/mobile` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run export:web`
- Reset local Supabase and run auth-backed student smoke checks for:
  1. profile overview query shape
  2. attach existing official tag
  3. duplicate attach handling
  4. custom create plus attach
  5. primary switch
  6. remove tag with primary fallback behavior
- Open the local web preview and verify `/student/profile`.
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
