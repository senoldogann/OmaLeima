# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/department-tags-foundation`
- **Goal:** Add the database foundation for optional student department tags before the profile UI branch starts.

## Architectural Decisions

- Keep this slice at the schema layer. The missing piece is durable data modeling and RLS, not the mobile UI yet.
- Follow the master-plan split directly:
  1. `department_tags` stores canonical tag records plus origin and moderation state
  2. `profile_department_tags` stores the student-to-tag attachments
- Enforce product limits in Postgres instead of trusting the future app layer:
  1. max 3 tags per profile
  2. max 1 primary tag per profile
  3. only active, non-merged tags can be attached
  4. only student profiles can hold profile department tags
  5. the max-3 rule must stay safe under concurrent inserts
- Keep RLS conservative:
  1. active tags are publicly readable for suggestions
  2. authenticated users may create only `USER` tags for themselves
  3. club staff may create official `CLUB` tags only for clubs they manage
  4. only platform admins may moderate, merge, or broadly manage tags
  5. profile-to-tag links stay owner-readable and owner-writable for now
- Seed a small deterministic local dataset so the later mobile profile UI has real examples immediately.
- Make cross-table repairs automatic when admins merge or block tags, or when a profile stops being an active student.

## Alternatives Considered

- Building the mobile department-tag picker first: rejected because the data model, moderation states, and limits would still be undefined.
- Making tag titles globally unique: rejected because the roadmap explicitly expects duplicates to exist and later be merged into a canonical record.
- Allowing public reads of every `profile_department_tags` row now: rejected because the current product only needs self-management and future public display is narrower than full tag history.
- Adding a full create-and-assign RPC in this branch: rejected for now to keep the step focused on schema, constraints, RLS, and seed readiness.

## Edge Cases

- A student tries to attach a fourth tag.
- Two near-simultaneous writes try to claim the third and fourth tag slot at the same time.
- A student tries to mark multiple tags as primary.
- A caller tries to attach a blocked or merged tag.
- A non-student profile tries to own department tags.
- A student tries to create an official club tag or impersonate another creator.
- A club organizer tries to create a tag for a club they do not manage.
- An admin merges a duplicate tag into another tag and future assignments must stop using the merged record.

## Validation Plan

- Create the new migration and update local seed data.
- Run `supabase db reset`.
- Use local authenticated PostgREST smoke checks for:
  1. public read of active tags
  2. student custom tag creation success
  3. organizer official tag creation success
  4. student attempt to create a club tag rejection
  5. student profile-tag attachment success up to 3 rows
  6. fourth attachment rejection
  7. merged-tag attachment rejection through database validation
  8. concurrent third-slot insert race, where only one write survives
  9. admin merge or profile-role change repair behavior
- Update `docs/DATABASE.md`, `PROGRESS.md`, `REVIEW.md`, `PLAN.md`, and `TODOS.md`.
