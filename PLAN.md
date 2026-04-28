# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/admin-club-official-department-tags`
- **Goal:** Finish the last remaining Phase 5 club panel workflow by adding organizer-owned official department tag creation.

## Architectural Decisions

- Keep this workflow in the existing `/club` shell and expose it as `/club/department-tags`.
- Make the route organizer-only. Active `OWNER` and `ORGANIZER` memberships may create official tags; `CLUB_STAFF` may not.
- Route writes through a server-side API boundary instead of direct browser inserts.
- Add a database RPC for official club tag creation so:
  1. actor profile and membership checks happen in one place
  2. duplicate title checks stay explicit
  3. club metadata can be copied consistently into the tag row
  4. response statuses stay stable for the web UI and smoke scripts
- Tighten direct write permissions for `CLUB` source tags so the browser cannot bypass the intended route or RPC path.
- Keep student custom `USER` tag creation untouched. This slice should not change the mobile profile behavior.
- Use a bounded read model that shows:
  1. organizer-manageable clubs
  2. existing official tags created by those clubs
  3. a small recent list so organizers can verify what is already live

## Alternatives Considered

- Reusing plain `insert into department_tags` from the route handler: rejected because it would preserve the broad RLS path and make duplicate handling less explicit.
- Letting `CLUB_STAFF` create official tags: rejected because it conflicts with the master plan and recent club panel patterns where catalog writes stay organizer-level.
- Routing club-created official tags through the admin moderation queue first: rejected for this slice. The product plan frames these as organizer-created official tags for their own community, not admin-reviewed drafts.
- Reusing the admin moderation page for club creation: rejected because the audience, permissions, and workflow are different.

## Edge Cases

- Organizer may belong to multiple clubs and must choose the correct source club.
- Organizer may have access to the club area but zero organizer-level memberships; route should redirect or deny cleanly.
- Same club may try to create the same title twice; the response should be deterministic.
- Different clubs may create the same visible title; that should remain possible without unstable slug conflicts.
- Club city or university metadata may be null; tag creation should still succeed with nullable copied fields.
- Existing staff memberships must still be able to read the club area generally, but must not gain this write path.

## Validation Plan

- Run `apps/admin` validation:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run build`
- Run auth-backed smoke checks for:
  1. organizer can open `/club/department-tags`
  2. student is redirected away
  3. staff is redirected or denied
  4. direct club-source insert into `department_tags` is blocked by RLS
  5. organizer route create succeeds
  6. duplicate create returns the expected duplicate status
  7. invalid club id or invalid title is rejected cleanly
  8. created row has `source_type = 'CLUB'`, correct `source_club_id`, `created_by`, and copied club metadata
  9. smoke cleanup leaves reruns stable
- Open local preview and verify:
  1. `/club`
  2. `/club/department-tags`
- Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.
