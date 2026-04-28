# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-department-tag-moderation`
- **Goal:** Add the next real system-admin workflow: duplicate and custom department-tag moderation with merge and block actions.

## Architectural Decisions

- Keep moderation reads on the server with the existing SSR Supabase client, then hand only serializable tag records into a small client component for interaction state.
- Extend the existing admin shell instead of creating a second layout pattern. The new route should feel like a direct part of `/admin`.
- Use a compact read model with summary cards plus bounded lists:
  1. pending review tags
  2. active user-created tags
  3. recently moderated tags
  4. active canonical merge targets
- Keep list limits explicit in UI copy so operators can see when a panel is showing “latest N” rather than the entire dataset.
- Back merge and block actions with DB atomic functions, then call them from admin route handlers. This keeps auth on the server, preserves trigger-driven link repair, and gives us stable status codes under concurrency.
- For smoke, seed deterministic `department_tags` and `profile_department_tags` fixtures directly into the local DB. Do not add production-only write paths just to manufacture moderation test data.
- Validation for this slice must include:
  1. route-level access checks for `/admin/department-tags`
  2. RLS smoke proving non-admin sessions cannot read pending, blocked, or merged tags
  3. admin merge flow updates the source tag and repairs dependent `profile_department_tags`
  4. admin block flow removes dependent profile links and returns stable repeat status
  5. standard `lint`, `typecheck`, and `build`
- CI, higher-volume load work, and GTM rollout details should be documented more explicitly after this slice, but not expanded into unrelated implementation work here.

## Alternatives Considered

- Moderating tags with direct `update` calls from a browser client: rejected because auth and concurrency handling are weaker than route-backed atomic functions.
- Building a broad searchable taxonomy tool first: rejected because this slice only needs duplicate or custom moderation and should stay narrowly scoped.
- Auto-merging duplicate tags by slug without an admin decision: rejected because false positives would be hard to unwind once profile links move.
- Shipping admin actions without data-level smoke: rejected because the user explicitly wants stronger RLS and operational confidence for admin workflows.

## Edge Cases

- Admin route must stay useful even when no tags need moderation; empty-state language should clarify that the queue is quiet rather than broken.
- Organizer or student sessions must not read pending, blocked, or merged tags, and non-admin route access must still redirect away from `/admin/department-tags`.
- Merge source and target must never be the same tag.
- Merge target must stay active and unmerged even if another moderation action lands first.
- Repeated merge or repeated block actions must return stable non-success statuses instead of pretending to succeed.
- Blocking or merging a tag that already has profile links must not leave duplicate or orphaned `profile_department_tags` rows behind.
- Bounded latest lists must not silently imply full coverage; UI should state the visible limit.
- Tag metadata such as source club, creator, and merge target may be partially null; the read model should normalize them into safe summary strings instead of leaking raw null-heavy rows.
- The route should stay compact on mobile and desktop; moderation rows should wrap instead of overflowing.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
- Run auth-backed smoke checks for:
  1. seeded platform admin can open `/admin/department-tags`
  2. seeded organizer is redirected away from that route
  3. organizer and student queries cannot read non-active moderation fixtures
  4. admin merge action succeeds once, then returns a stable already-merged style status
  5. admin block action succeeds once, then returns a stable already-blocked style status
  6. profile-link repair behaves correctly after merge and block
- Open the local web preview and verify:
  1. `/admin`
  2. `/admin/department-tags`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
